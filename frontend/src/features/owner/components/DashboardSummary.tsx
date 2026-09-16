/**
 * Dashboard Summary – Phase 14: stat cards with icons and skeleton loading
 */

import { useDashboardSummary } from '../hooks/useOwnerDashboard.js';

function SkeletonStatCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '40%' }} />
      <div className="skeleton skeleton-line" style={{ width: '60%', height: '28px', marginTop: '0.5rem' }} />
    </div>
  );
}

export default function DashboardSummary() {
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="dashboard-summary" aria-label="Loading dashboard stats" aria-busy="true">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-card" role="alert">
        Failed to load dashboard: {(error as any)?.response?.data?.error?.message || error.message}
      </div>
    );
  }

  const stats = [
    { icon: '🏠', label: 'Total Rooms', value: data?.totalRooms ?? 0 },
    { icon: '✅', label: 'Available', value: data?.availableRooms ?? 0 },
    { icon: '📅', label: 'Booked', value: data?.bookedRooms ?? 0 },
    { icon: '🗑️', label: 'Deleted', value: data?.deletedRooms ?? 0 },
  ];

  return (
    <div className="dashboard-summary" aria-label="Dashboard statistics">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <span className="stat-icon" aria-hidden="true">{s.icon}</span>
          <span className="stat-label">{s.label}</span>
          <span className="stat-value" aria-label={`${s.label}: ${s.value}`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
