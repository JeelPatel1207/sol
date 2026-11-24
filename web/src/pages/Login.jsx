import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Lock, User } from 'lucide-react';
import { api, getToken } from '../api';
import { strings } from '../i18n';
import ErrorBanner from '../components/ErrorBanner';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (getToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter both identifier and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.login(identifier, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-viewport" style={{ justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: 'var(--sun-glow)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}>
          <Sun size={36} color="var(--sun-yellow)" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{strings.loginTitle}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          {strings.loginSubtitle}
        </p>
      </div>

      <div className="card" style={{ padding: '24px 20px' }}>
        <ErrorBanner message={error} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              {strings.identifierLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={strings.identifierPlaceholder}
                autoComplete="username"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  padding: '0 14px 0 40px',
                  fontSize: '15px'
                }}
              />
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              {strings.passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={strings.passwordPlaceholder}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  padding: '0 14px 0 40px',
                  fontSize: '15px'
                }}
              />
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '48px',
              backgroundColor: 'var(--sun-yellow)',
              color: '#000000',
              fontWeight: 700,
              fontSize: '16px',
              marginTop: '8px'
            }}
          >
            {loading ? strings.signingIn : strings.loginButton}
          </button>
        </form>
      </div>
    </div>
  );
}
