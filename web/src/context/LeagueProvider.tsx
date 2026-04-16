import React from 'react';
import { useUser } from '../context';
import { subscribeToUserLeagues, subscribeToLeagueMembers } from '../services';
import { LeagueContext, type LeagueContextType } from './LeagueContext';

const PREFERRED_LEAGUE_KEY = 'preferredLeagueId';

const getPreferredLeagueId = (): string | null => {
  try {
    return localStorage.getItem(PREFERRED_LEAGUE_KEY);
  } catch {
    return null;
  }
};

const setPreferredLeagueId = (leagueId: string | null): void => {
  try {
    if (leagueId) {
      localStorage.setItem(PREFERRED_LEAGUE_KEY, leagueId);
    } else {
      localStorage.removeItem(PREFERRED_LEAGUE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

export const LeagueProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [leagues, setLeagues] = React.useState<LeagueContextType['leagues']>(
    []
  );
  const [selectedLeague, setSelectedLeagueState] =
    React.useState<LeagueContextType['selectedLeague']>(null);
  const [leagueMemberIds, setLeagueMemberIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const hasRestoredRef = React.useRef(false);

  const setSelectedLeague = React.useCallback(
    (league: LeagueContextType['selectedLeague']) => {
      setSelectedLeagueState(league);
      setPreferredLeagueId(league?.id ?? null);
    },
    []
  );

  React.useEffect(() => {
    if (!user) {
      setLeagues([]);
      setSelectedLeagueState(null);
      setLoading(false);
      hasRestoredRef.current = false;
      return;
    }

    const unsubscribe = subscribeToUserLeagues(user.id, (userLeagues) => {
      setLeagues(userLeagues);
      setLoading(false);

      if (!hasRestoredRef.current) {
        hasRestoredRef.current = true;
        const preferredId = getPreferredLeagueId();
        if (preferredId) {
          const preferredLeague = userLeagues.find((l) => l.id === preferredId);
          if (preferredLeague) {
            setSelectedLeagueState(preferredLeague);
            return;
          }
          setPreferredLeagueId(null);
        }
      }

      setSelectedLeagueState((current) => {
        if (!current) return current;

        const updatedLeague = userLeagues.find((l) => l.id === current.id);
        if (!updatedLeague) {
          setPreferredLeagueId(null);
          return null;
        }

        return updatedLeague;
      });
    });

    return () => unsubscribe();
  }, [user]);

  const selectedLeagueId = selectedLeague?.id ?? null;

  React.useEffect(() => {
    if (!selectedLeagueId) {
      setLeagueMemberIds([]);
      return;
    }

    const unsubscribe = subscribeToLeagueMembers(selectedLeagueId, (members) => {
      setLeagueMemberIds(members.map(m => m.user_id));
    });

    return () => unsubscribe();
  }, [selectedLeagueId]);

  return (
    <LeagueContext
      value={{
        leagues,
        selectedLeague,
        setSelectedLeague,
        leagueMemberIds,
        loading,
      }}
    >
      {children}
    </LeagueContext>
  );
};


