import React, { useState } from 'react';

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
  const ago = Math.abs(days);
  return `Expired ${ago} ${ago === 1 ? 'day' : 'days'} ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Amber "Renewing Soon" badge — driven entirely by the server-returned flag. */
function RenewalBadge({ renewingSoon }) {
  if (!renewingSoon) return <span className="renewal-neutral">—</span>;
  return <span className="badge badge--amber">Renewing Soon</span>;
}

/**
 * StatusToggle
 *
 * An accessible toggle switch for Active ↔ Paused.
 * Calls onToggle(newStatus) when the user clicks.
 * Disabled while a request for THIS row is in-flight.
 *
 * Props:
 *   status:    "active" | "paused"
 *   loading:   boolean  — disables the switch while the PATCH is in progress
 *   onToggle:  (newStatus: string) => void
 */
function StatusToggle({ status, loading, onToggle }) {
  const isActive = status === 'active';
  const nextStatus = isActive ? 'paused' : 'active';

  return (
    <div className="toggle-wrapper">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={`Toggle subscription ${isActive ? 'off' : 'on'}`}
        className={`toggle-switch ${isActive ? 'toggle-switch--on' : 'toggle-switch--off'} ${loading ? 'toggle-switch--loading' : ''}`}
        onClick={() => !loading && onToggle(nextStatus)}
        disabled={loading}
        title={loading ? 'Updating…' : isActive ? 'Click to pause' : 'Click to activate'}
      >
        <span className="toggle-thumb" />
      </button>
      <span className={`toggle-label ${isActive ? 'toggle-label--active' : 'toggle-label--paused'}`}>
        {loading ? '…' : isActive ? 'Active' : 'Paused'}
      </span>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

/**
 * SubscriptionRow
 *
 * Manages per-row toggle loading + error state.
 * Calls onToggleStatus(id, newStatus) which lives in App.jsx.
 */
function SubscriptionRow({ sub, onToggleStatus }) {
  const [rowLoading, setRowLoading] = useState(false);
  const [rowError, setRowError]     = useState('');

  async function handleToggle(newStatus) {
    setRowError('');
    setRowLoading(true);
    try {
      await onToggleStatus(sub.id, newStatus);
    } catch (err) {
      setRowError(err.message || 'Failed to update status.');
    } finally {
      setRowLoading(false);
    }
  }

  const isPaused   = sub.status === 'paused';
  const isRenewing = sub.renewingSoon && !isPaused;

  // Row class priority: paused overrides renewing-soon styling
  let rowClass = 'row';
  if (isPaused) {
    rowClass = 'row row--paused';
  } else if (sub.renewingSoon) {
    rowClass = 'row row--renewing';
  }

  return (
    <>
      <tr className={rowClass}>
        <td className="td-service">{sub.serviceName}</td>
        <td>{formatINR(sub.cost)}</td>
        <td>{sub.billingCycle}</td>
        <td>{formatINR(sub.monthlyCost)}</td>
        <td>{formatDate(sub.nextRenewalDate)}</td>
        <td className={sub.daysRemaining < 0 ? 'td-expired' : ''}>
          {formatDaysRemaining(sub.daysRemaining)}
        </td>
        <td>
          {/* Only show renewal badge for active subscriptions */}
          <RenewalBadge renewingSoon={isRenewing} />
        </td>
        <td>
          <StatusToggle
            status={sub.status}
            loading={rowLoading}
            onToggle={handleToggle}
          />
        </td>
      </tr>

      {/* Inline error row — appears directly under the subscription row */}
      {rowError && (
        <tr className="row-error-row">
          <td colSpan={8} className="row-error-cell">
            ⚠ {rowError}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * SubscriptionTable
 *
 * Props:
 *   subscriptions:    Array   – from GET /api/dashboard
 *   onToggleStatus:   (id, newStatus) => Promise<void>  – handled in App.jsx
 */
function SubscriptionTable({ subscriptions, onToggleStatus }) {
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
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default SubscriptionTable;
