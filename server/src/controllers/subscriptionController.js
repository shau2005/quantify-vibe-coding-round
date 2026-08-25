const service = require('../services/subscriptionService');

/**
 * GET /api/dashboard
 * Returns metrics and the full subscription list with derived fields.
 */
function getDashboard(req, res) {
  try {
    const data = service.getDashboardData();
    res.json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';
    res.status(status).json({ error: message });
  }
}

/**
 * POST /api/subscriptions
 * Validates input, creates a new subscription, returns it with derived fields.
 */
function createSubscription(req, res) {
  try {
    const created = service.createSubscription(req.body);
    res.status(201).json(created);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';
    res.status(status).json({ error: message });
  }
}

/**
 * PATCH /api/subscriptions/:id/status
 * Validates the new status, updates it, returns the updated subscription + metrics.
 */
function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = service.updateSubscriptionStatus(id, status);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';
    res.status(status).json({ error: message });
  }
}

module.exports = { getDashboard, createSubscription, updateStatus };
