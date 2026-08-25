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

// ─── Row ──────────────────────────────────────────────────────────────────────

/**
 * SubscriptionRow
 * Manages per-row toggle loading + error state.
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

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['All', 'Active', 'Paused'];

/**
 * TableToolbar
 * Renders the search input and All / Active / Paused filter buttons.
 */
function TableToolbar({ search, onSearch, statusFilter, onStatusFilter }) {
  return (
    <div className="table-toolbar">
      <div className="search-wrapper">
        <label htmlFor="sub-search" className="sr-only">Search subscriptions</label>
        <input
          id="sub-search"
          type="search"
          className="search-input"
          placeholder="Search subscriptions..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search subscriptions"
        />
      </div>

      <div className="filter-buttons" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-btn ${statusFilter === f ? 'filter-btn--active' : ''}`}
            onClick={() => onStatusFilter(f)}
            aria-pressed={statusFilter === f}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * SubscriptionTable
 *
 * Props:
 *   subscriptions:    Array   – sorted enriched list from GET /api/dashboard
 *   metrics:          Object  – server-returned metrics (includes counts)
 *   onToggleStatus:   (id, newStatus) => Promise<void>  – handled in App.jsx
 *
 * Search and filter are presentation-only: they never call the backend and
 * never modify metrics. The full subscriptions array stays intact in App.jsx.
 */
function SubscriptionTable({ subscriptions, metrics, onToggleStatus }) {
  // Search and filter state lives here — purely presentational
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // ── "No subscriptions at all" empty state ─────────────────────────────────
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

  // ── Presentation-only filtering (no backend call) ─────────────────────────
  const query = search.trim().toLowerCase();

  const visible = subscriptions.filter((sub) => {
    const matchesSearch = query === '' ||
      sub.serviceName.toLowerCase().includes(query);
    const matchesFilter =
      statusFilter === 'All' ||
      sub.status === statusFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  // ── Count summary (server-provided counts, displayed verbatim) ────────────
  const total  = (metrics?.activeSubscriptionsCount ?? 0) +
                 (metrics?.pausedSubscriptionsCount ?? 0);
  const active = metrics?.activeSubscriptionsCount ?? 0;
  const paused = metrics?.pausedSubscriptionsCount ?? 0;

  return (
    <section className="table-section">
      {/* Header row: title + sort caption */}
      <div className="table-header">
        <h2 className="table-title">Your Subscriptions</h2>
        <span className="table-sort-caption">Sorted by upcoming renewal</span>
      </div>

      {/* Count summary — server-calculated values, no React arithmetic */}
      <p className="count-summary">
        {total} {total === 1 ? 'subscription' : 'subscriptions'}
        {' • '}
        <span className="count-active">{active} Active</span>
        {' • '}
        <span className="count-paused">{paused} Paused</span>
      </p>

      {/* Search + filter toolbar */}
      <TableToolbar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* No-results state: data exists but nothing matches search/filter */}
      {visible.length === 0 ? (
        <p className="table-empty">
          No subscriptions match your search or filter.
        </p>
      ) : (
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
              {visible.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  sub={sub}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default SubscriptionTable;
