const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/subscriptions.json');

/**
 * Read all subscriptions from the JSON file.
 * Returns an empty array if the file is missing or empty.
 * @returns {Array}
 */
function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

/**
 * Persist the full subscriptions array back to the JSON file.
 * @param {Array} subscriptions
 */
function writeAll(subscriptions) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
}

/**
 * Find a single subscription by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
function findById(id) {
  return readAll().find((s) => s.id === id);
}

module.exports = { readAll, writeAll, findById };
