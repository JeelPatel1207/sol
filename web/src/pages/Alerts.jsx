import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, TrendingDown, AlertOctagon, CheckCheck, Bell } from 'lucide-react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function Alerts() {
  const { setUnseenCount } = useOutletContext() || {};
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAlerts(false);
      setAlerts(data);
      const unseen = data.filter(a => !a.seen).length;
      if (setUnseenCount) setUnseenCount(unseen);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markSeen = async (alertId) => {
    try {
      await api.markAlertSeen(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, seen: true } : a));
      if (setUnseenCount) setUnseenCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllSeen = async () => {
    try {
      await api.markAllAlertsSeen();
      setAlerts(prev => prev.map(a => ({ ...a, seen: true })));
      if (setUnseenCount) setUnseenCount(0);
    } catch (e) {}
  };

  const getAlertIcon = (type) => {
    if (type === 'offline') return <AlertTriangle size={20} color="var(--status-offline)" />;
    if (type === 'low_generation') return <TrendingDown size={20} color="var(--sun-yellow)" />;
    return <AlertOctagon size={20} color="var(--status-fault)" />;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>System Alerts</h2>
        {alerts.some(a => !a.seen) && (
          <button
            onClick={markAllSeen}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', padding: '6px 12px', minHeight: '36px', gap: '6px', color: 'var(--text-main)' }}
          >
            <CheckCheck size={16} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      <ErrorBanner message={error} onRetry={fetchAlerts} />

      {!loading && alerts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
          <Bell size={32} style={{ marginBottom: '8px' }} />
          <p>No active or past alerts.</p>
        </div>
      )}

      {alerts.map(a => (
        <div
          key={a.id}
          className="card"
          onClick={() => !a.seen && markSeen(a.id)}
          style={{
            cursor: !a.seen ? 'pointer' : 'default',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            borderColor: !a.seen ? 'var(--sun-yellow)' : 'var(--border)',
            backgroundColor: !a.seen ? 'var(--bg-card-hover)' : 'var(--bg-card)'
          }}
        >
          <div style={{ marginTop: '2px' }}>{getAlertIcon(a.type)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: !a.seen ? 800 : 600 }}>{a.plantName || 'Plant'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p style={{ fontSize: '13px', color: !a.seen ? 'var(--text-main)' : 'var(--text-muted)', marginBottom: '4px' }}>{a.message}</p>
            {a.resolvedAt && (
              <span style={{ fontSize: '11px', color: 'var(--status-online)', fontWeight: 600 }}>Resolved</span>
            )}
          </div>
          {!a.seen && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--sun-yellow)', alignSelf: 'center' }} />
          )}
        </div>
      ))}
    </div>
  );
}
