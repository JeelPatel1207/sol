import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../api';
import { formatInr, formatEnergy } from '../i18n';
import PowerCard from '../components/PowerCard';
import ErrorBanner from '../components/ErrorBanner';

export default function History() {
  const [searchParams] = useSearchParams();
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState(searchParams.get('plantId') || '');
  const [range, setRange] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPlants().then(list => {
      setPlants(list);
      if (!selectedPlantId && list.length > 0) {
        setSelectedPlantId(String(list[0].id));
      }
    }).catch(e => setError(e.message));
  }, [selectedPlantId]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPlantHistory(selectedPlantId, range, currentDate);
      setHistoryData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlantId, range, currentDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const shiftDate = (delta) => {
    const d = new Date(currentDate);
    if (range === 'day') d.setDate(d.getDate() + delta);
    else if (range === 'month') d.setMonth(d.getMonth() + delta);
    else if (range === 'year') d.setFullYear(d.getFullYear() + delta);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  const chartData = historyData?.points?.map(p => ({
    label: range === 'day' ? p.t?.slice(11, 16) : (range === 'month' ? p.date?.slice(8, 10) : p.month),
    val: range === 'day' ? p.kw : p.kwh
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>History</h2>
        {plants.length > 1 && (
          <select
            value={selectedPlantId}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px' }}
          >
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '4px', marginBottom: '14px' }}>
        {['day', 'month', 'year'].map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              flex: 1, minHeight: '36px', borderRadius: '8px', fontSize: '13px', textTransform: 'capitalize',
              backgroundColor: range === r ? 'var(--sun-yellow)' : 'transparent',
              color: range === r ? '#000' : 'var(--text-muted)'
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button onClick={() => shiftDate(-1)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 12px', minHeight: '36px' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>
          {range === 'day' ? currentDate : (range === 'month' ? currentDate.slice(0, 7) : currentDate.slice(0, 4))}
        </span>
        <button onClick={() => shiftDate(1)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 12px', minHeight: '36px' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <ErrorBanner message={error} onRetry={fetchHistory} />

      <div className="card" style={{ padding: '16px 12px', marginBottom: '14px' }}>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit={range === 'day' ? ' kW' : ' kWh'} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
              <Bar dataKey="val" fill="var(--sun-yellow)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <PowerCard label="Total Energy" value={formatEnergy(historyData?.totalKwh)} unit="kWh" />
        <PowerCard label="Savings" value={formatInr(historyData?.savingsInr)} />
      </div>
    </div>
  );
}
