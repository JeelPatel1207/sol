import React from 'react';

export default function StatusDot({ status = 'online', showLabel = false }) {
  const normalized = status ? status.toLowerCase() : 'offline';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className={`status-dot ${normalized}`} aria-label={`Status: ${normalized}`} />
      {showLabel && (
        <span style={{ fontSize: '13px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
          {normalized}
        </span>
      )}
    </span>
  );
}
