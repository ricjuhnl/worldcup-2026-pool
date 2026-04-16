import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserData } from '../services';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface UserContextType {
  user: UserData | null;
  loading: boolean;
  login: (username: string) => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  logout: () => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: async () => {},
  updateUser: async () => {},
  logout: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as UserData;
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, {
        username,
        displayName: username,
      });
      const userData = response.data as UserData;
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to login. Please try again.');
    }
  };

  const updateUser = async (data: Partial<UserData>) => {
    if (!user) return;
    try {
      const response = await axios.put(`${API_BASE_URL}/users/${user.id}`, {
        username: user.id,
        displayName: data.display_name || user.display_name,
      });
      const updatedUser = response.data as UserData;
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update profile.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    user,
    loading,
    login,
    updateUser,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
