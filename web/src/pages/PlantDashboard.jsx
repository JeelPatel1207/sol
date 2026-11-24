import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCw, AlertTriangle, BatteryCharging, DollarSign, Calendar } from 'lucide-react';
import { api } from '../api';
import { strings, formatInr, formatPower, formatEnergy } from '../i18n';
import StatusDot from '../components/StatusDot';
import LastUpdated from '../components/LastUpdated';
import PowerCard from '../components/PowerCard';
import EnergyChart from '../components/EnergyChart';
import ErrorBanner from '../components/ErrorBanner';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

export default function PlantDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLive = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await api.getPlantLive(id);
      setData(res);
    } catch (err) {
      setError(err.message || strings.errorLoading);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(() => fetchLive(true), 60000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  if (loading) return <DashboardSkeleton />;

  const isOffline = data && data.status === 'offline';
  const capacityPercent = data && data.powerKw ? Math.min(100, Math.round((data.powerKw / 5.0) * 100)) : 0;

  const formattedCurve = data?.todayCurve?.map(pt => {
    const d = new Date(pt.t);
    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return { time: timeStr, kw: pt.kw };
  }) || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Back"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px', minHeight: '36px', minWidth: '36px', color: 'var(--text-main)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StatusDot status={data?.status} />
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{data?.name}</h2>
            </div>
            <LastUpdated timestamp={data?.lastUpdated} />
          </div>
        </div>

        <button onClick={() => fetchLive(true)} disabled={refreshing} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', minHeight: '36px' }}>
          <RotateCw size={16} />
        </button>
      </div>

      <ErrorBanner message={error} onRetry={() => fetchLive()} />

      {isOffline && (
        <div className="offline-banner">
          <AlertTriangle size={18} color="var(--status-offline)" />
          <span>{strings.offlineSince(data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently')}</span>
        </div>
      )}

      {/* Hero Power Number */}
      <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {strings.powerNow}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', margin: '8px 0' }}>
          <span className="big-hero-number">{formatPower(data?.powerKw)}</span>
          <span className="unit-label">kW</span>
        </div>
        <div style={{ width: '80%', height: '8px', backgroundColor: 'var(--ring-bg)', borderRadius: '4px', margin: '10px auto 4px', overflow: 'hidden' }}>
          <div style={{ width: `${capacityPercent}%`, height: '100%', backgroundColor: 'var(--sun-yellow)', transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{capacityPercent}% of rated capacity</span>
      </div>

      {/* Metric Tiles */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <PowerCard label={strings.todayEnergy} value={formatEnergy(data?.todayKwh)} unit="kWh" icon={BatteryCharging} />
        <PowerCard label={strings.totalEnergy} value={formatEnergy(data?.totalKwh)} unit="kWh" />
        <PowerCard label={strings.savings} value={formatInr(data?.savingsTodayInr)} subtext={`Total: ${formatInr(data?.savingsTotalInr)}`} icon={DollarSign} />
      </div>

      {/* Today's Power Curve */}
      <EnergyChart data={formattedCurve} />

      {/* Tech Info */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 14px' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{strings.voltage}</span>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{data?.voltage ? `${data.voltage} V` : '-'}</div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)' }} />
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{strings.temperature}</span>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{data?.temperature ? `${data.temperature} °C` : '-'}</div>
        </div>
      </div>

      {/* History Button */}
      <button
        onClick={() => navigate(`/history?plantId=${id}`)}
        style={{ width: '100%', height: '46px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', gap: '8px', marginTop: '8px' }}
      >
        <Calendar size={16} />
        <span>{strings.history}</span>
      </button>
    </div>
  );
}
