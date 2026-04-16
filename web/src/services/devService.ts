import axios from 'axios';
import type { UserData } from './userService';
import type { MatchesData } from './matchService';
import { fetchMatches } from './matchService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const MOCK_NAMES: [string, string][] = [
  ['James', 'Hetfield'],
  ['Dave', 'Mustaine'],
  ['Tom', 'Araya'],
  ['Scott', 'Ian'],
  ['Trent', 'Reznor'],
  ['Cliff', 'Burton'],
  ['Kirk', 'Hammett'],
  ['Lars', 'Ulrich'],
  ['Les', 'Claypool'],
  ['Max', 'Cavalera'],
  ['Lemmy', 'Kilmister'],
  ['Ozzy', 'Osbourne'],
  ['Björk', 'Guðmundsdóttir'],
  ['Cate', 'Blanchett'],
  ['Nicole', 'Kidman'],
  ['Charlize', 'Theron'],
  ['Scarlett', 'Johansson'],
  ['Natalie', 'Portman'],
  ['Emma', 'Stone'],
  ['Margot', 'Robbie'],
  ['Viola', 'Davis'],
  ['Sandra', 'Bullock'],
  ['Julia', 'Roberts'],
  ['Angelina', 'Jolie'],
];

const generateMockUser = (index: number, timestamp: number): UserData => {
  const [firstName] = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const [, lastName] =
    MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const display_name = `${firstName} ${lastName}`;
  const id = `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;

  return {
    id,
    display_name,
    avatar_initials: display_name.slice(0, 2).toUpperCase(),
    score: 0,
    is_admin: 0,
    created_at: timestamp,
  };
};

const generatePredictionsForUser = async (
  userId: string,
  matches: MatchesData
): Promise<number> => {
  const matchIds = Object.keys(matches);

  for (const matchId of matchIds) {
    const gameId = parseInt(matchId, 10);
    await axios.post(`${API_BASE_URL}/predictions`, {
      userId,
      game: gameId,
      homePrediction: Math.floor(Math.random() * 6),
      awayPrediction: Math.floor(Math.random() * 6),
    });
  }

  return matchIds.length;
};

export const generateMockUsers = async (count: number): Promise<number> => {
  const matches = await fetchMatches();
  const timestamp = Date.now();
  let created = 0;

  for (let i = 0; i < count; i++) {
    const mockId = `mock_${timestamp}_${i}`;
    const userData = generateMockUser(i, timestamp);

    try {
      await axios.post(`${API_BASE_URL}/users`, {
        username: userData.id,
        displayName: userData.display_name,
      });

      if (matches) {
        await generatePredictionsForUser(mockId, matches);
      }

      created++;
    } catch (error) {
      console.error(`Failed to create mock user ${userData.id}:`, error);
    }
  }

  return created;
};

export const clearMockUsers = async (): Promise<number> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`);
    const users: UserData[] = response.data;
    let removed = 0;

    for (const user of users) {
      if (user.id.includes('mock_') || user.id.match(/\d+$/)) {
        await axios.delete(`${API_BASE_URL}/users/${user.id}`);
        removed++;
      }
    }

    return removed;
  } catch (error) {
    console.error('Error clearing mock users:', error);
    return 0;
  }
};

export const getMockUserCount = async (): Promise<number> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`);
    const users: UserData[] = response.data;
    return users.filter((u) => u.id.includes('mock_') || u.id.match(/\d+$/)).length;
  } catch {
    return 0;
  }
};
