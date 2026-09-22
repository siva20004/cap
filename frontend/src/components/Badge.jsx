import React from 'react';

export const Badge = ({ status, children }) => {
  const s = (status || children || '').toString().toUpperCase();
  let badgeClass = 'badge-pending';

  if (s === 'SUCCESS' || s === 'ACTIVE' || s === 'PASS' || s === 'TRAINED' || s === 'COMPLETED' || s === 'FEASIBLE') {
    badgeClass = 'badge-success';
  } else if (s === 'FAILED' || s === 'FAIL' || s === 'CRITICAL' || s === 'INFEASIBLE') {
    badgeClass = 'badge-failed';
  } else if (s === 'RUNNING' || s === 'PROCESSING') {
    badgeClass = 'badge-running';
  } else if (s === 'BLOCKED') {
    badgeClass = 'badge-blocked';
  } else if (s === 'WARNING' || s === 'PAUSED') {
    badgeClass = 'badge-warning';
  } else if (s === 'ANOMALOUS' || s === 'ANOMALY') {
    badgeClass = 'badge-anomaly';
  }

  return <span className={`badge ${badgeClass}`}>{children || status}</span>;
};

export default Badge;
