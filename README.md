# Subscription Tracker & Renewal Dashboard

A full-stack web application for tracking recurring subscription costs, monitoring monthly spend, and getting timely renewal alerts — built with React, Vite, Node.js, and Express.

---

## Overview

The Subscription Tracker lets you add personal or business subscriptions, normalise their costs to a monthly figure, and see which ones are coming up for renewal. All business calculations happen on the backend; the frontend only renders what the server returns.

---

## Features

- Add subscriptions with service name, cost, billing cycle, and next renewal date
- Automatic monthly cost normalisation (Yearly ÷ 12 on the server)
- Dashboard metrics: **Total Monthly Burn Rate** and **Upcoming Renewals**
- **Renewing Soon** amber alert badge for subscriptions within 7 days of renewal
- Active / Paused toggle — paused subscriptions are excluded from burn-rate calculations
- Full server-side input validation with clear error messages
- JSON file persistence — data survives browser and server restarts
- Responsive table with horizontal scroll on narrow screens

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, plain CSS |
| Backend | Node.js, Express 4 |
| Persistence | JSON flat file (`subscriptions.json`) |
| ID generation | `uuid` v4 |
| Dev tooling | nodemon |

---

## Architecture

```
client/                         # React + Vite frontend
  src/
    services/api.js             # All fetch() calls centralised here
    components/
      MetricsRow.jsx            # Displays burn rate + upcoming renewals
      SubscriptionForm.jsx      # Add-subscription form
      SubscriptionTable.jsx     # Table + toggle switch
    App.jsx                     # State coordinator
    styles.css                  # Global plain CSS

server/                         # Express backend
  src/
    routes/                     # Endpoint definitions only
      health.js
      subscriptions.js
    controllers/                # HTTP in/out, status codes
      healthController.js
      subscriptionController.js
    services/                   # All business rules & calculations
      subscriptionService.js
    utils/
      config.js                 # REFERENCE_DATE constant
      subscriptionRepository.js # JSON file read/write
    data/
      subscriptions.json        # Flat-file data store
    app.js                      # Express app setup
    server.js                   # Server entry point (port 5000)
```

**Responsibility boundaries:**

- **Routes** — define endpoints, nothing else
- **Controllers** — parse request, call service, set HTTP status
- **Services** — all validation, cost normalisation, renewal logic, metrics
- **Repository** — only reads and writes `subscriptions.json`
- **Frontend** — renders server-returned values; no business calculations

---

## Project Structure

```
Quantiphi_round2/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricsRow.jsx
│   │   │   ├── SubscriptionForm.jsx
│   │   │   └── SubscriptionTable.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── healthController.js
│   │   │   └── subscriptionController.js
│   │   ├── data/
│   │   │   └── subscriptions.json
│   │   ├── routes/
│   │   │   ├── health.js
│   │   │   └── subscriptions.js
│   │   ├── services/
│   │   │   └── subscriptionService.js
│   │   ├── utils/
│   │   │   ├── config.js
│   │   │   └── subscriptionRepository.js
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
├── package.json
└── README.md
```

---

## How to Run

### Backend

```bash
cd server
npm install
npm run dev       # starts with nodemon on http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev       # starts Vite dev server on http://localhost:5173
```

> The Vite dev server proxies `/api/*` requests to `http://localhost:5000`, so no URL is hardcoded in the frontend.

### Quick-start from repo root

```bash
npm run server    # backend (nodemon)
npm run client    # frontend (vite)
```

**Frontend:** http://localhost:5173  
**Backend:** http://localhost:5000

---

## API Endpoints

### `GET /api/health`

Returns server health status.

```json
{ "status": "ok" }
```

---

### `GET /api/dashboard`

Returns calculated metrics and the full subscription list with all derived fields.

```json
{
  "metrics": {
    "monthlyBurnRate": 700,
    "upcomingRenewalsCount": 1
  },
  "subscriptions": [
    {
      "id": "...",
      "serviceName": "Netflix",
      "cost": 600,
      "billingCycle": "Monthly",
      "nextRenewalDate": "2026-08-30",
      "status": "active",
      "monthlyCost": 600,
      "daysRemaining": 5,
      "renewingSoon": true
    }
  ]
}
```

---

### `POST /api/subscriptions`

Creates a new subscription. All fields are validated server-side.

**Request body:**

```json
{
  "serviceName": "Adobe",
  "cost": 1200,
  "billingCycle": "Yearly",
  "nextRenewalDate": "2026-09-20"
}
```

**Success — 201:**

```json
{
  "id": "...",
  "serviceName": "Adobe",
  "cost": 1200,
  "billingCycle": "Yearly",
  "nextRenewalDate": "2026-09-20",
  "status": "active",
  "monthlyCost": 100,
  "daysRemaining": 26,
  "renewingSoon": false
}
```

**Validation error — 400:**

```json
{ "error": "cost must be greater than 0" }
```

---

### `PATCH /api/subscriptions/:id/status`

Toggles a subscription between `active` and `paused`.

**Request body:**

```json
{ "status": "paused" }
```

**Success — 200:**

```json
{
  "updatedSubscription": { ... },
  "metrics": {
    "monthlyBurnRate": 100,
    "upcomingRenewalsCount": 0
  }
}
```

**Not found — 404:**

```json
{ "error": "Subscription not found" }
```

---

## Business Logic

### Monthly Cost Normalisation (Cost Uniformity Engine)

Calculated on the backend only — never in React.

| Billing Cycle | Formula | Example |
|---------------|---------|---------|
| Monthly | `monthlyCost = cost` | ₹600 → ₹600.00 |
| Yearly | `monthlyCost = cost / 12` | ₹1200 → ₹100.00 |

### Renewal Calculation

```
daysRemaining = nextRenewalDate − REFERENCE_DATE
renewingSoon  = daysRemaining >= 0 AND daysRemaining <= 7
```

All date arithmetic uses UTC midnight to prevent timezone-induced off-by-one errors.

### Dashboard Metrics

- **monthlyBurnRate** — sum of `monthlyCost` for **active** subscriptions only
- **upcomingRenewalsCount** — count of **active** subscriptions where `renewingSoon = true`
- Paused subscriptions are excluded from both metrics

---

## Assumptions

1. **Fixed reference date** — `REFERENCE_DATE = "2026-08-25"` is defined once in `server/src/utils/config.js`. Change it there to shift all renewal calculations.
2. **JSON persistence** — `subscriptions.json` is used intentionally as a lightweight store appropriate to this assessment scope. No database is required.
3. **`monthlyCost` is never stored** — it is derived on every read from `cost` and `billingCycle`. Changing either field will automatically recalculate it.
4. **Paused subscriptions are never deleted** — toggling to "paused" only changes the `status` field. The subscription remains visible in the table (greyed out) and in the data store.
5. **Billing cycle values are case-sensitive** — the API accepts exactly `"Monthly"` or `"Yearly"`.
6. **Date validation** rejects impossible calendar dates (e.g., `2026-02-31`, `2026-13-10`) by parsing and comparing UTC date components.
