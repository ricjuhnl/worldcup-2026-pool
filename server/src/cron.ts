import * as cron from 'node-cron';
import { getDb, saveDb } from './db.js';

const FIFA_API_URL = 'https://api.fifa.com/api/v3/calendar/matches';
const SEASON_ID = '285023';
const COMPETITION_ID = '17';

interface FifaMatch {
  IdMatch: string;
  StageName: Array<{ Description: string }>;
  GroupName: Array<{ Description: string }> | null;
  Date: string;
  Stadium: {
    Name: Array<{ Description: string }>;
  };
  Home: {
    Abbreviation: string | null;
    ShortClubName: string | null;
    Score: number | null;
  };
  Away: {
    Abbreviation: string | null;
    ShortClubName: string | null;
    Score: number | null;
  };
  PlaceHolderA: string;
  PlaceHolderB: string;
}

interface PointsResult {
  user_id: string;
  game: number;
  points: number;
}

const getWinner = (home: number, away: number): 'home' | 'away' | 'tied' => {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'tied';
};

const calculatePoints = (
  homeScore: number,
  awayScore: number,
  homePrediction: number | null,
  awayPrediction: number | null
): number => {
  if (homeScore < 0 || homePrediction === null || awayPrediction === null) {
    return 0;
  }

  if (homeScore === homePrediction && awayScore === awayPrediction) {
    return 15;
  }

  if (getWinner(homeScore, awayScore) === getWinner(homePrediction, awayPrediction)) {
    const difference = Math.abs(homePrediction - homeScore) + Math.abs(awayPrediction - awayScore);
    return Math.max(0, 10 - difference);
  }

  return 0;
};

export const syncMatchScores = async () => {
  try {
    console.log('Syncing match scores from FIFA API...');
    
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const url = new URL(FIFA_API_URL);
    url.searchParams.set('idseason', SEASON_ID);
    url.searchParams.set('idcompetition', COMPETITION_ID);
    url.searchParams.set('from', startOfDay.toISOString());
    url.searchParams.set('to', endOfDay.toISOString());
    url.searchParams.set('count', '500');
    
    const response = await fetch(url.toString());
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('FIFA API response:', response.status, responseText.substring(0, 200));
      throw new Error(`FIFA API error: ${response.status}`);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse FIFA API response:', responseText.substring(0, 200));
      throw new Error('Invalid JSON response from FIFA API');
    }
    
    const results = data.Results as FifaMatch[];
    
    if (!results || results.length === 0) {
      console.log('No matches found for today');
      return;
    }
    
    const db = await getDb();
    
    const currentStmt = db.prepare('SELECT * FROM matches');
    const currentMatches: any[] = [];
    while (currentStmt.step()) {
      currentMatches.push(currentStmt.getAsObject());
    }
    currentStmt.free();
    
    const updates: { game: number; home_score: number; away_score: number }[] = [];
    
    for (const fifaMatch of results) {
      for (const match of currentMatches) {
        if (match.fifa_id === fifaMatch.IdMatch) {
          const homeScore = fifaMatch.Home?.Score ?? -1;
          const awayScore = fifaMatch.Away?.Score ?? -1;
          
          if (match.home_score !== homeScore && homeScore >= 0) {
            updates.push({ game: match.game, home_score: homeScore, away_score: awayScore });
          }
        }
      }
    }
    
    if (updates.length > 0) {
      for (const update of updates) {
        db.run('UPDATE matches SET home_score = ?, away_score = ? WHERE game = ?', [
          update.home_score,
          update.away_score,
          update.game
        ]);
      }
      
      saveDb();
      console.log(`Updated ${updates.length} match scores`);
      
      await recalculatePoints();
    } else {
      console.log('No score changes detected');
    }
  } catch (error) {
    console.error('Error syncing match scores:', error);
  }
};

const recalculatePoints = async () => {
  try {
    console.log('Recalculating prediction points...');
    
    const db = await getDb();
    
    const matchesStmt = db.prepare('SELECT * FROM matches WHERE home_score >= 0 AND away_score >= 0');
    const matches: any[] = [];
    while (matchesStmt.step()) {
      matches.push(matchesStmt.getAsObject());
    }
    matchesStmt.free();
    
    if (matches.length === 0) {
      return;
    }
    
    const allResults: PointsResult[] = [];
    
    for (const match of matches) {
      const predStmt = db.prepare('SELECT * FROM predictions WHERE game = ?');
      predStmt.bind([match.game]);
      
      while (predStmt.step()) {
        const prediction = predStmt.getAsObject() as any;
        const points = calculatePoints(
          match.home_score,
          match.away_score,
          prediction.home_prediction,
          prediction.away_prediction
        );
        
        if (prediction.points !== points) {
          allResults.push({
            user_id: prediction.user_id,
            game: match.game,
            points,
          });
        }
      }
      predStmt.free();
    }
    
    if (allResults.length > 0) {
      for (const result of allResults) {
        db.run('UPDATE predictions SET points = ? WHERE user_id = ? AND game = ?', [
          result.points,
          result.user_id,
          result.game
        ]);
      }
      
      saveDb();
      console.log(`Updated ${allResults.length} prediction points`);
      
      await updateUserScores();
    } else {
      console.log('No prediction points to update');
    }
  } catch (error) {
    console.error('Error recalculating points:', error);
  }
};

const updateUserScores = async () => {
  try {
    console.log('Updating user scores...');
    
    const db = await getDb();
    
    const usersStmt = db.prepare('SELECT * FROM users');
    const users: any[] = [];
    while (usersStmt.step()) {
      users.push(usersStmt.getAsObject());
    }
    usersStmt.free();
    
    for (const user of users) {
      const totalStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM predictions WHERE user_id = ?');
      totalStmt.bind([user.id]);
      totalStmt.step();
      const totalScore = totalStmt.getAsObject() as any;
      totalStmt.free();
      
      const newScore = totalScore.total;
      
      if (user.score !== newScore) {
        db.run('UPDATE users SET score = ? WHERE id = ?', [newScore, user.id]);
        console.log(`User ${user.id}: score ${user.score} -> ${newScore}`);
      }
    }
    
    saveDb();
  } catch (error) {
    console.error('Error updating user scores:', error);
  }
};

export const start = () => {
  cron.schedule('*/10 * * * *', () => {
    console.log('Running scheduled sync...');
    void syncMatchScores();
  });
  
  console.log('Cron job scheduled: sync every 10 minutes');
};

export const stop = () => {
  console.log('Stopping cron jobs...');
};
