const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api', healthRoutes);

module.exports = app;
