import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout, Button, Card, LeaguePicture } from '../components';
import { useUser } from '../context';
import { useLeague } from '../hooks';
import {
  getLeagueBySlug,
  joinLeague,
  isLeagueMember,
  normalizeUsername,
  type LeagueWithId,
} from '../services';

export const JoinLeague = () => {
  const { slug, inviteCode } = useParams<{
    slug: string;
    inviteCode: string;
  }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useUser();
  const { setSelectedLeague } = useLeague();

  const [league, setLeague] = React.useState<LeagueWithId | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !authLoading) {
      window.hideSplash?.();
    }
  }, [loading, authLoading]);

  React.useEffect(() => {
    if (!slug) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    getLeagueBySlug(slug)
      .then((fetchedLeague) => {
        if (!fetchedLeague) {
          setError('League not found');
        } else if (
          inviteCode?.toUpperCase() !== fetchedLeague.invite_code.toUpperCase()
        ) {
          setError('Invalid invite code');
        } else {
          setLeague(fetchedLeague);
        }
      })
      .catch((err) => {
        console.error('Error fetching league:', err);
        setError('Failed to load league');
      })
      .finally(() => setLoading(false));
  }, [slug, inviteCode]);

  React.useEffect(() => {
    if (authLoading || loading || !league || !user || joining) return;

    const performJoin = async () => {
      setJoining(true);
      try {
        const alreadyMember = await isLeagueMember(league.id, normalizeUsername(user.id));
        if (alreadyMember) {
          setSelectedLeague(league);
          void navigate(`/league/${league.slug}`, { replace: true });
          return;
        }

        await joinLeague(league.id, normalizeUsername(user.id));
        setSelectedLeague(league);
        void navigate(`/league/${league.slug}`, { replace: true });
      } catch (err) {
        console.error('Error joining league:', err);
        setError('Failed to join league');
        setJoining(false);
      }
    };

    void performJoin();
  }, [authLoading, loading, league, user, joining, navigate]);

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/70">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (error || !league) {
    return (
      <AppLayout>
        <div className="pt-8 px-4 pb-8 max-w-md mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Oops!
            </h1>
            <p className="text-white/70 mb-4">
              {error || 'League not found'}
            </p>
            <Button
              onClick={() => void navigate('/leagues')}
              variant="secondary"
            >
              Back to Leagues
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pt-8 px-4 pb-8 max-w-md mx-auto">
        <Card className="p-6 text-center">
          <LeaguePicture src={league.imageURL || ''} name={league.name} size="xl" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {league.name}
          </h1>
          <p className="text-white/70 mb-6">
            You have successfully joined the league!
          </p>
          <Button onClick={() => void navigate(`/league/${league.slug}`)}>
            View League
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
};
