import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface UserData {
  id: string;
  display_name: string;
  avatar_initials: string;
  photoURL?: string;
  score: number;
  is_admin: number;
  created_at: number;
}

export const RESERVED_USERNAMES = [
  'about',
  'leaderboard',
  'rules',
  'edit-profile',
  'editprofile',
  'admin',
  'api',
  'settings',
  'login',
  'signin',
  'signup',
  'register',
  'logout',
  'signout',
  'profile',
  'user',
  'users',
  'club',
  'clubs',
];

export const normalizeUsername = (userName: string): string => {
  return userName.toLowerCase().replace(/\./g, '');
};

export const isReservedUsername = (userName: string): boolean => {
  return RESERVED_USERNAMES.includes(normalizeUsername(userName));
};

export const sanitizeUsername = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
};

export const handleUserLogin = async (username: string): Promise<UserData> => {
  const response = await axios.post(`${API_BASE_URL}/users`, {
    username,
  });
  
  const data = response.data as UserData;
  return {
    ...data,
    id: data.id || username.toLowerCase().replace(/\./g, ''),
    display_name: data.display_name || '',
    avatar_initials: data.avatar_initials || '',
    score: data.score ?? 0,
    is_admin: data.is_admin ?? 0,
    created_at: data.created_at ?? Date.now(),
  };
};

export const checkUsernameAvailable = async (
  userName: string
): Promise<boolean> => {
  const normalized = normalizeUsername(userName);
  if (!normalized || normalized.length < 3) return false;

  if (RESERVED_USERNAMES.includes(normalized)) return false;

  try {
    await getUserByUsername(userName);
    return false; // Username exists
  } catch {
    return true; // Username doesn't exist
  }
};

export const updateUserProfile = async (
  userId: string,
  data: { userName: string; displayName: string }
) => {
  const newUserName = sanitizeUsername(data.userName);
  
  const response = await axios.put(`${API_BASE_URL}/users/${userId}`, {
    username: newUserName,
    displayName: data.displayName,
  });
  
  return response.data;
};

export const getUserByUsername = async (
  userName: string
): Promise<UserData | null> => {
  const normalized = normalizeUsername(userName);
  const response = await axios.get(`${API_BASE_URL}/users/${normalized}`);
  
  return response.data as UserData;
};

export const uploadProfilePicture = async (
  _userId: string,
  _file: File
): Promise<string> => {
  // Profile pictures not supported - using initials instead
  return '';
};

export interface UserWithId extends UserData {
  id: string;
}

export const subscribeToLeaderboard = (
  callback: (users: UserWithId[]) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      const users = response.data.map((u: any) => ({
        ...u,
        id: u.id,
        display_name: u.display_name,
        avatar_initials: u.avatar_initials,
        score: u.score ?? 0,
        is_admin: u.is_admin ?? 0,
        created_at: u.created_at ?? 0,
      })) as UserWithId[];
      users.sort((a, b) => b.score - a.score);
      callback(users);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      callback([]);
    }
  };

  fetchUsers();
  intervalId = setInterval(fetchUsers, 30000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

export const deleteUserAccount = async (
  userId: string
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/${userId}`);
};
