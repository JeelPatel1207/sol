import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Sun, Bell, Shield, LogOut, Moon } from 'lucide-react';
import { getUser, api } from '../api';
import { strings } from '../i18n';

export default function Layout() {
  const user = getUser();
  const isAdmin = user && user.role === 'admin';

  const [theme, setTheme] = useState(localStorage.getItem('solar_theme') || 'dark');
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('solar_theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchUnseen = async () => {
      try {
        const alerts = await api.getAlerts(true);
        setUnseenCount(alerts.length);
      } catch (e) {}
    };
    fetchUnseen();
    const interval = setInterval(fetchUnseen, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-viewport">
      <header style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={24} color="var(--sun-yellow)" />
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>{strings.appName}</span>
        </div>
        <button
          onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
          aria-label="Toggle Theme"
          style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '8px', minHeight: '36px', minWidth: '36px' }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="content-area">
        <Outlet context={{ setUnseenCount }} />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Sun size={20} />
          <span>{strings.navPlants}</span>
        </NavLink>

        <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Bell size={20} />
            {unseenCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-8px', backgroundColor: 'var(--status-fault)',
                color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '10px',
                padding: '1px 5px', minWidth: '16px', textAlign: 'center'
              }}>
                {unseenCount}
              </span>
            )}
          </div>
          <span>{strings.navAlerts}</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Shield size={20} />
            <span>{strings.navAdmin}</span>
          </NavLink>
        )}

        <button
          onClick={() => api.logout()}
          className="nav-item"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
        >
          <LogOut size={20} />
          <span>{strings.logout}</span>
        </button>
      </nav>
    </div>
  );
}
