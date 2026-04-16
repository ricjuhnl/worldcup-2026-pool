import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface League {
  name: string;
  slug: string;
  owner_id: string;
  invite_code: string;
  created_at: number;
  description?: string;
  imageURL?: string;
}

export interface LeagueWithId extends League {
  id: string;
  member_count?: number;
}

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const createLeague = async (
  name: string,
  ownerId: string,
  options?: {
    slug?: string;
    description?: string;
  }
): Promise<LeagueWithId> => {
  const slug = options?.slug ? generateSlug(options.slug) : generateSlug(name);
  
  const response = await axios.post(`${API_BASE_URL}/leagues`, {
    name,
    ownerId,
    slug,
    description: options?.description,
  });
  
  const data = response.data as LeagueWithId;
  return {
    ...data,
    name: data.name || '',
    slug: data.slug || '',
    owner_id: data.owner_id || ownerId,
    invite_code: data.invite_code || '',
    created_at: data.created_at || Date.now(),
  };
};

export const getLeagueBySlug = async (
  slug: string
): Promise<LeagueWithId | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/leagues/${slug}`);
    return response.data as LeagueWithId;
  } catch {
    return null;
  }
};

export const getLeagueByInviteCode = async (
  inviteCode: string
): Promise<LeagueWithId | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/leagues/join/${inviteCode}`);
    const data = response.data as LeagueWithId;
    return {
      ...data,
      name: data.name || '',
      slug: data.slug || '',
      owner_id: data.owner_id || '',
      invite_code: data.invite_code || inviteCode,
      created_at: data.created_at || Date.now(),
    };
  } catch {
    return null;
  }
};

export const joinLeague = async (
  leagueId: string,
  userId: string
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/leagues/${leagueId}/join`, { userId });
};

export const leaveLeague = async (
  leagueId: string,
  userId: string
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/leagues/${leagueId}/leave`, {
    data: { userId },
  });
};

export interface LeagueMember {
  user_id: string;
  display_name: string;
  score: number;
}

export const getLeagueMembers = async (leagueId: string): Promise<LeagueMember[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/leagues/${leagueId}/members`);
    return response.data as LeagueMember[];
  } catch {
    return [];
  }
};

export const subscribeToLeagueMembers = (
  leagueId: string,
  callback: (members: LeagueMember[]) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const fetchMembers = async () => {
    try {
      const members = await getLeagueMembers(leagueId);
      callback(members);
    } catch (error) {
      console.error('Error fetching league members:', error);
      callback([]);
    }
  };

  fetchMembers();
  intervalId = setInterval(fetchMembers, 30000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

export const isLeagueMember = async (
  leagueId: string,
  userId: string
): Promise<boolean> => {
  try {
    const members = await getLeagueMembers(leagueId);
    return members.some(member => member.user_id === userId);
  } catch {
    return false;
  }
};

export const subscribeToUserLeagues = (
  userId: string,
  callback: (leagues: LeagueWithId[]) => void
): (() => void) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const fetchLeagues = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leagues/user/${userId}`);
      callback(response.data as LeagueWithId[]);
    } catch (error) {
      console.error('Error fetching user leagues:', error);
      callback([]);
    }
  };

  fetchLeagues();
  intervalId = setInterval(fetchLeagues, 30000);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

export const regenerateInviteCode = async (
  _leagueId: string
): Promise<string> => {
  return '';
};

export const updateLeague = async (
  leagueId: string,
  updates: {
    name?: string;
    description?: string;
    imageURL?: string;
  }
): Promise<void> => {
  console.log('Updating league:', leagueId, updates);
};

export const uploadLeagueImage = async (
  _leagueId: string,
  _file: File
): Promise<string> => {
  return '';
};

export const getLeaguesOwnedByUser = async (
  userId: string
): Promise<LeagueWithId[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/leagues/user/${userId}`);
    const allLeagues = response.data as LeagueWithId[];
    return allLeagues.filter(league => league.owner_id === userId);
  } catch {
    return [];
  }
};

export const deleteLeague = async (
  leagueId: string,
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/leagues/${leagueId}`);
};

export const checkSlugAvailable = async (slug: string): Promise<boolean> => {
  try {
    await getLeagueBySlug(slug);
    return false; // League exists
  } catch {
    return true; // League doesn't exist
  }
};
