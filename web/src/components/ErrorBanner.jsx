import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { strings } from '../i18n';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={18} />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: '13px',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            minHeight: 'auto',
            padding: '4px'
          }}
        >
          <RotateCw size={14} />
          {strings.retry}
        </button>
      )}
    </div>
  );
}
