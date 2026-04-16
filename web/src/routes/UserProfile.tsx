import React from 'react';
import { useParams } from 'react-router-dom';
import {
  AppLayout,
  MatchesByDay,
  MatchesByGroup,
  MatchesHeader,
  UserHeader,
} from '../components';
import { useMatches, useUser } from '../hooks';
import {
  type UserPredictions,
  subscribeToPredictions,
  getUserByUsername,
} from '../services';

type ViewMode = 'day' | 'group';

export const UserProfile = () => {
  const { userName } = useParams();
  const { matches, loading: matchesLoading, error } = useMatches();
  const { user } = useUser();
  const [viewMode, setViewMode] = React.useState<ViewMode>('day');
  const [predictions, setPredictions] = React.useState<UserPredictions>({});
  const [profileUserId, setProfileUserId] = React.useState<string | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);

  const isOwnProfile = user?.id === userName;

  React.useEffect(() => {
    setProfileLoading(true);
    setProfileUserId(null);
    setPredictions({});
  }, [userName]);

  React.useEffect(() => {
    if (isOwnProfile && user) {
      setProfileUserId(user.id);
      setProfileLoading(false);
    } else if (userName) {
      getUserByUsername(userName)
        .then((profileUser) => {
          setProfileUserId(profileUser?.id ?? null);
        })
        .catch(console.error)
        .finally(() => setProfileLoading(false));
    }
  }, [userName, isOwnProfile, user]);

  React.useEffect(() => {
    if (!profileUserId) return;

    const unsubscribe = subscribeToPredictions(profileUserId, setPredictions);
    return () => unsubscribe();
  }, [profileUserId]);

  const loading = profileLoading || matchesLoading;

  return (
    <AppLayout>
      <div className="pt-8 px-4 pb-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center text-white/70 py-20">Loading...</div>
        ) : (
          <>
            {profileUserId && (
              <UserHeader
                userId={profileUserId}
                className="mb-8 border-b border-white/10 pb-8"
              />
            )}

            <MatchesHeader viewMode={viewMode} onViewModeChange={setViewMode} />

            {error && (
              <div className="text-center text-red-400">Error: {error}</div>
            )}

            {matches &&
              (viewMode === 'day' ? (
                <MatchesByDay
                  matches={matches}
                  isOwnProfile={isOwnProfile}
                  userId={profileUserId ?? undefined}
                  predictions={predictions}
                />
              ) : (
                <MatchesByGroup
                  matches={matches}
                  isOwnProfile={isOwnProfile}
                  userId={profileUserId ?? undefined}
                  predictions={predictions}
                />
              ))}
          </>
        )}
      </div>
    </AppLayout>
  );
};
