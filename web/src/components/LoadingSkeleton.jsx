import React from 'react';

export function CardSkeleton() {
  return (
    <div className="card" style={{ height: '90px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="skeleton" style={{ height: '18px', width: '50%' }} />
      <div className="skeleton" style={{ height: '32px', width: '70%' }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: '24px', width: '40%' }} />
      <div className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="skeleton" style={{ flex: 1, height: '80px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ flex: 1, height: '80px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ flex: 1, height: '80px', borderRadius: '12px' }} />
      </div>
      <div className="skeleton" style={{ height: '220px', borderRadius: '16px' }} />
    </div>
  );
}

export default {
  CardSkeleton,
  DashboardSkeleton
};
