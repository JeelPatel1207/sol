import React from 'react';
import { strings } from '../i18n';

export default function LastUpdated({ timestamp }) {
  if (!timestamp) return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>;

  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  let text;
  if (diffMin < 1) {
    text = strings.updatedJustNow;
  } else if (diffMin < 60) {
    text = strings.updatedMinutesAgo(diffMin);
  } else {
    text = strings.updatedHoursAgo(diffHours);
  }

  return (
    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>
      {text}
    </span>
  );
}
