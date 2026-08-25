import React, { useState, useEffect, useCallback } from 'react';
import { fetchDashboard, updateSubscriptionStatus } from './services/api';
import MetricsRow from './components/MetricsRow';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionTable from './components/SubscriptionTable';

function App() {
  const [metrics, setMetrics] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  // Single request that feeds MetricsRow and SubscriptionTable
  const loadDashboard = useCallback(async () => {
    try {
      setDashboardError('');
      const data = await fetchDashboard();
      setMetrics(data.metrics);
      setSubscriptions(data.subscriptions);
    } catch (err) {
      setDashboardError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Called by SubscriptionForm after a successful POST
  function handleSubscriptionCreated() {
    loadDashboard();
  }

  /**
   * Called by SubscriptionRow when the user flips the toggle.
   *
   * The backend PATCH /api/subscriptions/:id/status returns:
   *   { updatedSubscription, metrics }
   *
   * We apply that response directly — no metric arithmetic in React.
   * Throws on error so SubscriptionRow can show the per-row message.
   */
  async function handleToggleStatus(id, newStatus) {
    const result = await updateSubscriptionStatus(id, newStatus);

    // Update subscriptions list: swap only the changed row
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? result.updatedSubscription : s))
    );

    // Update metrics from server-calculated values — no React arithmetic
    setMetrics(result.metrics);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Subscription Tracker</h1>
        <p className="app-subtitle">Monitor your recurring costs in one place</p>
      </header>

      <main className="app-main">
        {loading && (
          <p className="status-message">Loading dashboard…</p>
        )}

        {!loading && dashboardError && (
          <p className="status-message status-message--error">{dashboardError}</p>
        )}

        {!loading && !dashboardError && (
          <MetricsRow metrics={metrics} />
        )}

        <SubscriptionForm onSuccess={handleSubscriptionCreated} />

        {!loading && (
          <SubscriptionTable
            subscriptions={subscriptions}
            metrics={metrics}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </main>
    </div>
  );
}

export default App;
