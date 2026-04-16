import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      await login(username.trim());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '400px',
        width: '100%',
        padding: '32px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ marginBottom: '16px', textAlign: 'center' }}>
          World Cup 2026 Pool
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="username" style={{ fontWeight: '500', color: '#333' }}>
            Enter username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              backgroundColor: '#fff',
              color: '#333',
            }}
          />
        </div>

        {error && (
          <div style={{
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          Register
        </button>
      </form>
    </div>
  );
};
