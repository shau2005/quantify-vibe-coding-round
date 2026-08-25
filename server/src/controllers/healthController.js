/**
 * GET /api/health
 * Returns server health status.
 */
const getHealth = (req, res) => {
  res.json({ status: 'ok' });
};

module.exports = { getHealth };
