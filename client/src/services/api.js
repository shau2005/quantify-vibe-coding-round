/**
 * Frontend API service — all fetch calls go through here.
 * The Vite dev server proxies /api/* to http://localhost:5000,
 * so no base URL is hardcoded.
 */

const API_BASE = '/api';

/**
 * Fetch dashboard data: metrics + subscription list.
 * @returns {Promise<{ metrics: Object, subscriptions: Array }>}
 */
export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error: ${res.status}`);
  }
  return res.json();
}

/**
 * Create a new subscription.
 * @param {{ serviceName: string, cost: number, billingCycle: string, nextRenewalDate: string }} data
 * @returns {Promise<Object>} the created subscription with derived fields
 */
export async function createSubscription(data) {
  const res = await fetch(`${API_BASE}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Server error: ${res.status}`);
  }
  return body;
}
