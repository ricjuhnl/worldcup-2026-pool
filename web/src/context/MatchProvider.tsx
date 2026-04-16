import React from 'react';
import { fetchMatches, type MatchesData } from '../services/matchService';
import { MatchContext } from './MatchContext';

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [matches, setMatches] = React.useState<MatchesData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMatches = async () => {
    try {
      const data = await fetchMatches();
      setMatches(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadMatches();

    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    matches,
    loading,
    error,
  };

  return <MatchContext value={value}>{children}</MatchContext>;
};
