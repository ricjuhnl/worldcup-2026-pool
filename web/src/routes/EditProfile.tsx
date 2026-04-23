import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppLayout,
  Card,
  Button,
  LinkButton,
  ProfilePicture,
  useConfirm,
} from '../components';
import { useUser } from '../context';
import { useToast } from '../hooks/useToast';
import {
  checkUsernameAvailable,
  deleteUserAccount,
  isReservedUsername,
  sanitizeUsername,
} from '../services';

export const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const { showToast } = useToast();
  const { showConfirm, ConfirmDialogComponent } = useConfirm();
  const [userName, setUserName] = React.useState(user?.id ?? '');
  const [displayName, setDisplayName] = React.useState(
    user?.display_name ?? ''
  );
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = React.useState<
    'idle' | 'checking' | 'available' | 'taken' | 'reserved'
  >('idle');

  const originalUserName = user?.id ?? '';

  React.useEffect(() => {
    setUserName(user?.id ?? '');
    setDisplayName(user?.display_name ?? '');
  }, [user?.id, user?.display_name]);

  React.useEffect(() => {
    if (userName === originalUserName) {
      setUsernameStatus('idle');
      return;
    }

    if (userName.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (isReservedUsername(userName)) {
      setUsernameStatus('reserved');
      return;
    }

    setUsernameStatus('checking');

    const timeoutId = setTimeout(() => {
      checkUsernameAvailable(userName)
        .then((available) => {
          setUsernameStatus(available ? 'available' : 'taken');
        })
        .catch(() => {
          setUsernameStatus('idle');
        });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userName, originalUserName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (usernameStatus === 'taken' || usernameStatus === 'reserved') return;

    const finalUserName = sanitizeUsername(userName);

    setSaving(true);
    setError(null);

    try {
      await updateUser({
        id: finalUserName,
        display_name: displayName,
      });

      void navigate(`/${finalUserName}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = await showConfirm({
      title: 'Delete Account',
      message:
        'Are you sure you want to permanently delete your account? This will remove all your data, predictions, and league memberships. This action cannot be undone.',
      confirmText: 'Delete Account',
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteUserAccount(user.id);
      showToast('Account deleted successfully', 'success');
      void navigate('/', { replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      showToast('Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  const isFormValid =
    userName.length >= 3 &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'reserved' &&
    usernameStatus !== 'checking';

  const inputClass =
    'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors';
  const labelClass = 'block text-white/70 text-sm mb-2';

  return (
    <AppLayout>
      <div className="md:min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6 text-center">
              Edit Profile
            </h1>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <ProfilePicture
                    name={displayName || userName}
                    size="xl"
                    className="border-2 border-white/20"
                  />
                </div>
                <p className="text-sm text-white/60">
                  Your avatar is generated from your display name
                </p>
              </div>

              <div>
                <label htmlFor="displayName" className={labelClass}>
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="userName" className={labelClass}>
                  Username
                </label>
                <div className="relative">
                  <input
                    id="userName"
                    type="text"
                    value={userName}
                    onChange={(e) =>
                      setUserName(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._-]/g, '')
                          .replace(/^\./, '')
                          .replace(/\.{2,}/g, '.')
                      )
                    }
                    onBlur={(e) =>
                      setUserName(sanitizeUsername(e.target.value))
                    }
                    placeholder="your-username"
                    className={`${inputClass} ${usernameStatus === 'taken' || usernameStatus === 'reserved' ? 'border-red-400' : usernameStatus === 'available' ? 'border-green-400' : ''}`}
                    required
                    minLength={3}
                  />
                  {usernameStatus === 'checking' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                      Checking...
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">
                      ✓ Available
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">
                      ✗ Taken
                    </span>
                  )}
                  {usernameStatus === 'reserved' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm">
                      ✗ Reserved
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs mt-1">
                  Letters, numbers, periods, hyphens, and underscores only.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 mt-4">
                <LinkButton
                  to={`/${userName ?? ''}`}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </LinkButton>
                <Button
                  type="submit"
                  disabled={saving || !isFormValid}
                  className="flex-1"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <span className="sm:hidden">Save</span>
                      <span className="hidden sm:inline">Save Changes</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting}
                  className="text-red-500/70 hover:text-red-400 text-sm transition-colors disabled:opacity-50 hover:cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete my account'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
      {ConfirmDialogComponent}
    </AppLayout>
  );
};
