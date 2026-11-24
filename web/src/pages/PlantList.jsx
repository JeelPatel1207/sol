import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw, ChevronRight, Zap } from 'lucide-react';
import { api } from '../api';
import { strings, formatPower, formatEnergy } from '../i18n';
import StatusDot from '../components/StatusDot';
import LastUpdated from '../components/LastUpdated';
import ErrorBanner from '../components/ErrorBanner';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function PlantList() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlants = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await api.getPlants();
      setPlants(data);
    } catch (err) {
      setError(err.message || strings.errorLoading);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchPlants(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchPlants]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{strings.navPlants}</h2>
        <button
          onClick={() => fetchPlants(true)}
          disabled={refreshing}
          aria-label={strings.pullToRefresh}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            gap: '6px',
            minHeight: '36px'
          }}
        >
          <RotateCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      <ErrorBanner message={error} onRetry={() => fetchPlants()} />

      {loading && (
        <div>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!loading && plants.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
          <Zap size={36} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
          <p>{strings.noPlantsFound}</p>
        </div>
      )}

      {!loading && plants.map((plant) => (
        <div
          key={plant.id}
          className="card clickable"
          onClick={() => navigate(`/plants/${plant.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusDot status={plant.status} />
              <span style={{ fontSize: '17px', fontWeight: 700 }}>{plant.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LastUpdated timestamp={plant.lastUpdated} />
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {strings.powerNow}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="big-hero-number" style={{ fontSize: '32px' }}>
                  {formatPower(plant.powerKw)}
                </span>
                <span className="unit-label">kW</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {strings.todayEnergy}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                {formatEnergy(plant.todayKwh)} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kWh</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
