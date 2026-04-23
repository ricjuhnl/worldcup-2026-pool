import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../hooks';
import { subscribeToLeaderboard, type UserWithId } from '../../services';
import { getPositionCompact } from '../../utils';
import { Card, ProfilePicture } from '../ui';
import { Podium } from './Podium';

type LeaderboardProps = {
  variant?: 'compact' | 'full';
  users?: UserWithId[];
  onRemoveMember?: (userId: string, displayName: string) => void;
};

const UserRow = ({
  user,
  position,
  isCurrentUser,
  compact,
  onRemove,
}: {
  user: UserWithId;
  position: number;
  isCurrentUser: boolean;
  compact: boolean;
  onRemove?: () => void;
}) => (
  <div
    className={`flex items-center gap-2 rounded-lg transition-colors px-2 py-1.5 ${
      isCurrentUser
        ? 'border border-white/20 backdrop-blur-lg bg-white/10 hover:bg-white/15'
        : 'hover:bg-white/5'
    }`}
  >
    <Link
      to={`/${user.id}`}
      className="flex items-center gap-2 flex-1 min-w-0"
    >
      <span
        className={`text-center ${compact ? 'w-6 text-sm' : 'w-12 text-lg'}`}
      >
        {getPositionCompact(position)}
      </span>
      <ProfilePicture
        src={user.photoURL}
        name={user.display_name}
        size={compact ? 'xs' : 'sm'}
      />
      <div className="flex-1 min-w-0">
        <div
          className={`text-white truncate ${compact ? 'text-sm' : 'font-medium'}`}
        >
          {user.display_name}
        </div>
        {!compact && (
          <div className="text-white/50 text-sm">@{user.id}</div>
        )}
      </div>
      <span
        className={`text-white/70 font-medium ${compact ? 'text-sm' : 'text-lg'}`}
      >
        {user.score}
        {!compact && <span className="text-sm font-normal"> pts</span>}
      </span>
    </Link>
    {onRemove && (
      <button
        onClick={onRemove}
        className="p-1.5 text-white/30 rounded hover:cursor-pointer hover:text-white/80"
        title="Remove from league"
      >
        ✕
      </button>
    )}
  </div>
);

export const LeaderboardList = ({
  variant = 'compact',
  users: externalUsers,
  onRemoveMember,
}: LeaderboardProps) => {
  const { user: currentUser } = useUser();
  const [allUsers, setAllUsers] = React.useState<UserWithId[]>([]);
  const [loading, setLoading] = React.useState(!externalUsers);
  const [showTopFade, setShowTopFade] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Subscribe to global leaderboard
  React.useEffect(() => {
    if (externalUsers) return;

    const unsubscribe = subscribeToLeaderboard((data) => {
      setAllUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [externalUsers]);

  const users = externalUsers ?? allUsers;

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowTopFade(scrollRef.current.scrollTop > 10);
    }
  };

  if (loading) {
    return (
      <div className="text-white/50 text-sm text-center py-4">Loading...</div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-white/50 text-sm text-center py-4">
        No players yet
      </div>
    );
  }

  const isCompact = variant === 'compact';

  // Split users for podium display (full variant only)
  const podiumUsers = !isCompact && users.length >= 3 ? users.slice(0, 3) : [];
  const restUsers = !isCompact && users.length >= 3 ? users.slice(3) : users;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h3 className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 px-4">
        Leaderboard
      </h3>
      {/* Podium for full variant */}
      {!isCompact && <Podium users={podiumUsers} />}

      {/* User list - wrapped in Card for full variant */}
      {isCompact ? (
        <div className="relative flex-1 min-h-0">
          <div
            className={`absolute top-0 left-0 right-0 h-8 bg-linear-to-b from-black to-transparent pointer-events-none z-10 transition-opacity ${
              showTopFade ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex flex-col overflow-y-auto h-full gap-y-2 px-2 pb-6"
          >
            {users.map((user, index) => (
              <UserRow
                key={user.id}
                user={user}
                position={index + 1}
                isCurrentUser={currentUser?.id === user.id}
                compact
                onRemove={
                  onRemoveMember
                    ? () => onRemoveMember(user.id, user.display_name)
                    : undefined
                }
              />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black to-transparent pointer-events-none" />
        </div>
      ) : (
        <Card className="p-4">
          <div className="flex flex-col gap-1">
            {restUsers.map((user, index) => (
              <UserRow
                key={user.id}
                user={user}
                position={users.length >= 3 ? index + 4 : index + 1}
                isCurrentUser={currentUser?.id === user.id}
                compact={false}
                onRemove={
                  onRemoveMember
                    ? () => onRemoveMember(user.id, user.display_name)
                    : undefined
                }
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
