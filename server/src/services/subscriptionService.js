const { v4: uuidv4 } = require('uuid');
const repo = require('../utils/subscriptionRepository');
const { REFERENCE_DATE } = require('../utils/config');

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string into a UTC midnight Date so that timezone
 * differences never shift the day by one.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDateUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calculate the number of whole days between two YYYY-MM-DD strings.
 * Positive if dateStr is in the future relative to referenceStr.
 * @param {string} dateStr        – the subscription's nextRenewalDate
 * @param {string} referenceStr   – REFERENCE_DATE constant
 * @returns {number}
 */
function calcDaysRemaining(dateStr, referenceStr) {
  const target = parseDateUTC(dateStr);
  const ref = parseDateUTC(referenceStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target - ref) / msPerDay);
}

// ─── Cost Uniformity Engine ───────────────────────────────────────────────────

/**
 * Normalise any subscription's cost to a monthly figure.
 * Monthly  → cost as-is
 * Yearly   → cost ÷ 12, rounded to 2 decimal places
 * @param {Object} subscription
 * @returns {number}
 */
function calcMonthlyCost({ cost, billingCycle }) {
  if (billingCycle === 'Yearly') {
    return Math.round((cost / 12) * 100) / 100;
  }
  return Math.round(cost * 100) / 100;
}

// ─── Derived fields ───────────────────────────────────────────────────────────

/**
 * Attach computed fields (monthlyCost, daysRemaining, renewingSoon)
 * to a raw subscription object. Does NOT mutate the stored record.
 * @param {Object} sub – stored subscription
 * @returns {Object}
 */
function withDerivedFields(sub) {
  const monthlyCost = calcMonthlyCost(sub);
  const daysRemaining = calcDaysRemaining(sub.nextRenewalDate, REFERENCE_DATE);
  const renewingSoon = daysRemaining >= 0 && daysRemaining <= 7;

  return { ...sub, monthlyCost, daysRemaining, renewingSoon };
}

// ─── Dashboard metrics ────────────────────────────────────────────────────────

/**
 * Calculate dashboard-level metrics from an array of enriched subscriptions.
 * Only ACTIVE subscriptions contribute to financial metrics.
 * @param {Array} enriched – subscriptions already decorated with derived fields
 * @returns {{ monthlyBurnRate: number, upcomingRenewalsCount: number }}
 */
function calcMetrics(enriched) {
  const active = enriched.filter((s) => s.status === 'active');

  const monthlyBurnRate =
    Math.round(
      active.reduce((sum, s) => sum + s.monthlyCost, 0) * 100
    ) / 100;

  const upcomingRenewalsCount = active.filter((s) => s.renewingSoon).length;

  return { monthlyBurnRate, upcomingRenewalsCount };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_BILLING_CYCLES = ['Monthly', 'Yearly'];
const VALID_STATUSES = ['active', 'paused'];

/**
 * Validate the body of a POST /api/subscriptions request.
 * @param {Object} body
 * @returns {string|null} – error message, or null if valid
 */
function validateSubscriptionInput({ serviceName, cost, billingCycle, nextRenewalDate }) {
  if (serviceName === undefined || serviceName === null) {
    return 'serviceName is required';
  }
  if (typeof serviceName !== 'string' || serviceName.trim() === '') {
    return 'serviceName must be a non-empty string';
  }
  if (cost === undefined || cost === null) {
    return 'cost is required';
  }
  if (typeof cost !== 'number' || isNaN(cost)) {
    return 'cost must be a number';
  }
  if (cost <= 0) {
    return 'cost must be greater than 0';
  }
  if (!VALID_BILLING_CYCLES.includes(billingCycle)) {
    return `billingCycle must be one of: ${VALID_BILLING_CYCLES.join(', ')}`;
  }
  if (!nextRenewalDate) {
    return 'nextRenewalDate is required';
  }
  // Strict YYYY-MM-DD with calendar validity check
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(nextRenewalDate)) {
    return 'nextRenewalDate must be in YYYY-MM-DD format';
  }
  const parsed = parseDateUTC(nextRenewalDate);
  if (isNaN(parsed.getTime())) {
    return 'nextRenewalDate is not a valid calendar date';
  }
  // Catch impossible dates like 2026-02-30
  const [y, m, d] = nextRenewalDate.split('-').map(Number);
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() + 1 !== m ||
    parsed.getUTCDate() !== d
  ) {
    return 'nextRenewalDate is not a valid calendar date';
  }
  return null;
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Return dashboard data: metrics + enriched subscription list.
 */
function getDashboardData() {
  const all = repo.readAll();
  const enriched = all.map(withDerivedFields);
  const metrics = calcMetrics(enriched);
  return { metrics, subscriptions: enriched };
}

/**
 * Create and persist a new subscription.
 * @param {Object} body – validated request body
 * @returns {Object} – the created subscription with derived fields
 */
function createSubscription(body) {
  const error = validateSubscriptionInput(body);
  if (error) throw { statusCode: 400, message: error };

  const newSub = {
    id: uuidv4(),
    serviceName: body.serviceName.trim(),
    cost: body.cost,
    billingCycle: body.billingCycle,
    nextRenewalDate: body.nextRenewalDate,
    status: 'active',
  };

  const all = repo.readAll();
  all.push(newSub);
  repo.writeAll(all);

  return withDerivedFields(newSub);
}

/**
 * Update the status of an existing subscription.
 * @param {string} id
 * @param {string} status
 * @returns {{ updatedSubscription: Object, metrics: Object }}
 */
function updateSubscriptionStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw { statusCode: 400, message: `status must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  const all = repo.readAll();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) {
    throw { statusCode: 404, message: 'Subscription not found' };
  }

  all[index] = { ...all[index], status };
  repo.writeAll(all);

  const enriched = all.map(withDerivedFields);
  const metrics = calcMetrics(enriched);
  const updatedSubscription = enriched[index];

  return { updatedSubscription, metrics };
}

module.exports = {
  getDashboardData,
  createSubscription,
  updateSubscriptionStatus,
};
