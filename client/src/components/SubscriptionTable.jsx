import React from 'react';

// ─── Formatters (display only — no calculations) ──────────────────────────────

/** Format a number as Indian Rupee currency. */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a YYYY-MM-DD string as "30 Aug 2026".
 * Pure display — no arithmetic on the date.
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format the backend-returned daysRemaining number for display.
 * No date arithmetic — only number-to-string conversion.
 */
function formatDaysRemaining(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days > 1) return `${days} days`;
  // Negative: expired
  const ago = Math.abs(days);
  return `Expired ${ago} ${ago === 1 ? 'day' : 'days'} ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Amber "Renewing Soon" badge — shown only when backend sets renewingSoon=true. */
function RenewalBadge({ renewingSoon }) {
  if (!renewingSoon) return <span className="renewal-neutral">—</span>;
  return <span className="badge badge--amber">Renewing Soon</span>;
}

/** Simple status badge — Active / Paused. No toggle yet. */
function StatusBadge({ status }) {
  const cls = status === 'active' ? 'badge badge--active' : 'badge badge--paused';
  const label = status === 'active' ? 'Active' : 'Paused';
  return <span className={cls}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * SubscriptionTable
 *
 * Renders subscriptions returned by GET /api/dashboard.
 * All derived values (monthlyCost, daysRemaining, renewingSoon)
 * are passed straight from the server response — no recalculation.
 *
 * Props:
 *   subscriptions: Array  – the subscriptions[] from the dashboard response
 */
function SubscriptionTable({ subscriptions }) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <section className="table-section">
        <h2 className="table-title">Your Subscriptions</h2>
        <p className="table-empty">
          No subscriptions yet. Add your first subscription above.
        </p>
      </section>
    );
  }

  return (
    <section className="table-section">
      <h2 className="table-title">Your Subscriptions</h2>

      {/* Wrapper allows horizontal scroll on narrow viewports */}
      <div className="table-scroll">
        <table className="sub-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Original Cost</th>
              <th>Billing Cycle</th>
              <th>Monthly Cost</th>
              <th>Next Renewal</th>
              <th>Days Remaining</th>
              <th>Renewal Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className={sub.renewingSoon ? 'row row--renewing' : 'row'}
              >
                <td className="td-service">{sub.serviceName}</td>
                <td>{formatINR(sub.cost)}</td>
                <td>{sub.billingCycle}</td>
                <td>{formatINR(sub.monthlyCost)}</td>
                <td>{formatDate(sub.nextRenewalDate)}</td>
                <td className={sub.daysRemaining < 0 ? 'td-expired' : ''}>
                  {formatDaysRemaining(sub.daysRemaining)}
                </td>
                <td>
                  <RenewalBadge renewingSoon={sub.renewingSoon} />
                </td>
                <td>
                  <StatusBadge status={sub.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SubscriptionTable;
