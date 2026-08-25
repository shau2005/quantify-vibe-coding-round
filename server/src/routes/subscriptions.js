const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriptionController');

// Dashboard — metrics + enriched subscription list
router.get('/dashboard', controller.getDashboard);

// Create a new subscription
router.post('/subscriptions', controller.createSubscription);

// Toggle active/paused status
router.patch('/subscriptions/:id/status', controller.updateStatus);

module.exports = router;
