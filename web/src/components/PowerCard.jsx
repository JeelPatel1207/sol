import React from 'react';

export default function PowerCard({ label, value, unit, subtext, icon: Icon }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: '100px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon && <Icon size={16} color="var(--sun-yellow)" />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sun-yellow)' }}>
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
