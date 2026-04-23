import React from 'react';
import { ProfilePicture } from '../ui/ProfilePicture';
import { getMedalOrPosition, getPositionColor } from '../../utils';
import {
  subscribeToLeaderboard,
  type UserData,
  type UserWithId,
} from '../../services';

type UserHeaderProps = {
  userId: string;
  className?: string;
};

export const UserHeader = ({ userId, className = '' }: UserHeaderProps) => {
  const [user, setUser] = React.useState<UserData | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserWithId[]>([]);

  // Subscribe to leaderboard to get user data
  React.useEffect(() => {
    const unsubscribe = subscribeToLeaderboard((users) => {
      setAllUsers(users);
      const foundUser = users.find((u) => u.id === userId);
      if (foundUser) {
        setUser(foundUser);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // Calculate position
  const position = React.useMemo(() => {
    if (!user) return null;

    const idx = allUsers.findIndex((u) => u.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [user, userId, allUsers]);

  const positionColor = getPositionColor(position ?? 0);
  const positionText = getMedalOrPosition(position ?? 0);

  if (!user) return null;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <ProfilePicture
        src={user.photoURL}
        name={user.display_name}
        size="md"
        className="border-2 border-white/20"
      />
      <div className="flex flex-col items-start text-left flex-1">
        <h1 className="text-2xl font-bold text-white">{user.display_name}</h1>
        <div className="flex items-center gap-3 text-white/70 text-sm flex-wrap">
          <span>@{user.id}</span>
          <span>·</span>
          <span>{user.score} pts</span>
          {position !== null && (
            <span className={positionColor}>{positionText}</span>
          )}
        </div>
      </div>
    </div>
  );
};
