const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const subscriptionRoutes = require('./routes/subscriptions');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api', subscriptionRoutes);

module.exports = app;
