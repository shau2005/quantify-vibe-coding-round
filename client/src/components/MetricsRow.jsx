import React from 'react';

/**
 * Formats a number as Indian Rupee currency.
 * Values come from the server — no calculation happens here.
 */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * MetricsRow
 * Displays server-returned monthlyBurnRate and upcomingRenewalsCount.
 *
 * Props:
 *   metrics: { monthlyBurnRate: number, upcomingRenewalsCount: number }
 */
function MetricsRow({ metrics }) {
  const burnRate = metrics?.monthlyBurnRate ?? 0;
  const renewalsCount = metrics?.upcomingRenewalsCount ?? 0;

  return (
    <div className="metrics-row">
      <div className="metric-card">
        <span className="metric-label">Total Monthly Burn Rate</span>
        <span className="metric-value metric-value--burn">{formatINR(burnRate)}</span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Upcoming Renewals</span>
        <span className="metric-value metric-value--renewals">{renewalsCount}</span>
      </div>
    </div>
  );
}

export default MetricsRow;
