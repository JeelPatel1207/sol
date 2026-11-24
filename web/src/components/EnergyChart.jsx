import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { strings } from '../i18n';

export default function EnergyChart({ data = [] }) {
  return (
    <div className="card" style={{ padding: '16px 12px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
        {strings.todayPowerCurve}
      </span>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="solarGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--sun-yellow)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--sun-yellow)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" kW" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '12px'
              }}
            />
            <Area type="monotone" dataKey="kw" stroke="var(--sun-yellow)" strokeWidth={2.5} fillOpacity={1} fill="url(#solarGlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
