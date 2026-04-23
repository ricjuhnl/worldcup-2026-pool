import { getDb, saveDb } from '../db.js';

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
    CityName: Array<{ Description: string }>;
    IdCountry: string;
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

export const syncMatchesFromApi = async (): Promise<number> => {
  try {
    console.log('Fetching matches from FIFA API...');

    const url = new URL(FIFA_API_URL);
    url.searchParams.set('idseason', SEASON_ID);
    url.searchParams.set('idcompetition', COMPETITION_ID);
    url.searchParams.set('count', '500');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`FIFA API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.Results as FifaMatch[];

    if (!results || results.length === 0) {
      console.log('No matches found from FIFA API');
      return 0;
    }

    const matches: Array<{
      game: number;
      fifa_id: string;
      round: string;
      group_letter: string | null;
      date: string;
      location: string;
      location_city: string;
      location_country: string;
      stadium: string;
      home_abbreviation: string;
      home_team: string;
      away_abbreviation: string;
      away_team: string;
      home_score: number;
      away_score: number;
    }> = [];

    results.forEach((item, index) => {
      const game = index + 1;
      const round = item.StageName?.[0]?.Description ?? '';
      const group = item.GroupName?.[0]?.Description?.replace('Group ', '') ?? null;
      const homeAbbreviation = item.Home?.Abbreviation ?? item.PlaceHolderA;
      const homeName = item.Home?.ShortClubName ?? homeAbbreviation;
      const awayAbbreviation = item.Away?.Abbreviation ?? item.PlaceHolderB;
      const awayName = item.Away?.ShortClubName ?? awayAbbreviation;
      const stadium = item.Stadium?.Name?.[0]?.Description ?? '';
      const city = item.Stadium?.CityName?.[0]?.Description ?? '';
      const country = item.Stadium?.IdCountry ?? '';

      matches.push({
        game,
        fifa_id: item.IdMatch,
        round,
        group_letter: group,
        date: item.Date,
        location: stadium || city,
        location_city: city,
        location_country: country,
        stadium: stadium,
        home_abbreviation: homeAbbreviation,
        home_team: homeName,
        away_abbreviation: awayAbbreviation,
        away_team: awayName,
        home_score: item.Home?.Score ?? -1,
        away_score: item.Away?.Score ?? -1,
      });
    });

    const db = await getDb();
    db.run('DELETE FROM matches');

    const insertStmt = db.prepare(`
      INSERT INTO matches (game, fifa_id, round, group_letter, date, location, location_city, location_country, stadium, home_abbreviation, home_team, away_abbreviation, away_team, home_score, away_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const match of matches) {
      insertStmt.bind([
        match.game,
        match.fifa_id,
        match.round,
        match.group_letter,
        match.date,
        match.location,
        match.location_city,
        match.location_country,
        match.stadium,
        match.home_abbreviation,
        match.home_team,
        match.away_abbreviation,
        match.away_team,
        match.home_score,
        match.away_score,
      ]);
      insertStmt.step();
      insertStmt.reset();
    }
    insertStmt.free();

    saveDb();

    console.log(`Successfully synced ${matches.length} matches from FIFA API`);
    return matches.length;
  } catch (error) {
    console.error('Error syncing matches from FIFA API:', error);
    throw error;
  }
};
