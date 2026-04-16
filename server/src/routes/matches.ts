import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

// Transform database row to client format
const transformMatch = (match: any) => {
  return {
    game: match.game,
    fifaId: match.fifa_id,
    round: match.round || '',
    group: match.group_letter,
    date: match.date,
    timestamp: new Date(match.date).getTime(),
    location: match.location || '',
    locationCity: '',
    locationCountry: '',
    home: match.home_team || '',
    homeName: match.home_team || '',
    homeScore: match.home_score ?? -1,
    away: match.away_team || '',
    awayName: match.away_team || '',
    awayScore: match.away_score ?? -1,
  };
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM matches ORDER BY game');
    const matches: any[] = [];

    while (stmt.step()) {
      matches.push(stmt.getAsObject());
    }
    stmt.free();

    // Transform to client format as an object
    const transformedMatches = matches.map(transformMatch);
    const matchesObject: any = {};
    transformedMatches.forEach((match) => {
      matchesObject[match.game] = match;
    });

    res.json(matchesObject);
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:game', async (req: Request, res: Response) => {
  try {
    const { game } = req.params;
    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM matches WHERE game = ?');
    stmt.bind([parseInt(game as string)]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = stmt.getAsObject() as any;
    stmt.free();

    res.json(transformMatch(match));
  } catch (error) {
    console.error('Error getting match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const FIFA_API_URL = 'https://api.fifa.com/api/v3/calendar/matches';
    const SEASON_ID = '285023';
    const COMPETITION_ID = '17';

    const url = new URL(FIFA_API_URL);
    url.searchParams.set('idseason', SEASON_ID);
    url.searchParams.set('idcompetition', COMPETITION_ID);
    url.searchParams.set('count', '500');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`FIFA API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.Results;

    const matches: any[] = [];

    results.forEach((item: any, index: number) => {
      const game = index + 1;
      const round = item.StageName?.[0]?.Description ?? '';
      const group =
        item.GroupName?.[0]?.Description?.replace('Group ', '') ?? null;
      const home = item.Home?.Abbreviation ?? item.PlaceHolderA;
      const homeName = item.Home?.ShortClubName ?? item.PlaceHolderA;
      const away = item.Away?.Abbreviation ?? item.PlaceHolderB;
      const awayName = item.Away?.ShortClubName ?? item.PlaceHolderB;

      matches.push({
        game,
        fifa_id: item.IdMatch,
        round,
        group_letter: group,
        date: item.Date,
        location: item.Stadium?.Name?.[0]?.Description ?? '',
        home_team: homeName || home,
        away_team: awayName || away,
        home_score: item.Home?.Score ?? -1,
        away_score: item.Away?.Score ?? -1,
      });
    });

    const db = await getDb();
    db.run('DELETE FROM matches');

    const insertStmt = db.prepare(`
      INSERT INTO matches (game, fifa_id, round, group_letter, date, location, home_team, away_team, home_score, away_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const match of matches) {
      insertStmt.bind([
        match.game,
        match.fifa_id,
        match.round,
        match.group_letter,
        match.date,
        match.location,
        match.home_team,
        match.away_team,
        match.home_score,
        match.away_score,
      ]);
      insertStmt.step();
      insertStmt.reset();
    }
    insertStmt.free();

    saveDb();

    // Return transformed matches to client as an object
    const transformedMatches = matches.map(transformMatch);
    const matchesObject: any = {};
    transformedMatches.forEach((match) => {
      matchesObject[match.game] = match;
    });
    res.json(matchesObject);
  } catch (error) {
    console.error('Error syncing matches:', error);
    res.status(500).json({ error: 'Failed to sync matches' });
  }
});

export default router;
