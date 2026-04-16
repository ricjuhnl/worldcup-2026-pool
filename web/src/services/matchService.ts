import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Match {
  game: number;
  fifaId: string;
  round: string;
  group: string | null;
  date: string;
  timestamp: number;
  location: string;
  locationCity: string;
  locationCountry: string;
  home: string;
  homeName: string;
  homeScore: number;
  away: string;
  awayName: string;
  awayScore: number;
}

export interface MatchesData {
  [key: string]: Match;
}

export const fetchMatches = async (): Promise<MatchesData> => {
  const response = await axios.get(`${API_BASE_URL}/matches`);
  return response.data as MatchesData;
};

export const getMatch = async (gameNumber: string): Promise<Match | null> => {
  const response = await axios.get(`${API_BASE_URL}/matches/${gameNumber}`);
  return response.data as Match | null;
};

export const refreshMatches = async (): Promise<MatchesData> => {
  const response = await axios.post(`${API_BASE_URL}/matches/sync`);
  return response.data as MatchesData;
};
