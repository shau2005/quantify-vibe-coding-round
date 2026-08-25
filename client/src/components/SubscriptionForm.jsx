import React, { useState } from 'react';
import { createSubscription } from '../services/api';

const EMPTY_FORM = {
  serviceName: '',
  cost: '',
  billingCycle: 'Monthly',
  nextRenewalDate: '',
};

/**
 * SubscriptionForm
 * Collects raw user input and POSTs it to the backend.
 * No business calculations happen here — monthlyCost, daysRemaining,
 * and renewingSoon are all derived server-side.
 *
 * Props:
 *   onSuccess: (createdSubscription) => void  – called after a successful POST
 */
function SubscriptionForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error as soon as user starts editing
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Send raw values — backend handles validation & calculation
      const payload = {
        serviceName: form.serviceName,
        cost: Number(form.cost),
        billingCycle: form.billingCycle,
        nextRenewalDate: form.nextRenewalDate,
      };

      const created = await createSubscription(payload);
      setForm(EMPTY_FORM);    // reset form on success
      onSuccess(created);     // let parent refresh dashboard
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-section">
      <h2 className="form-title">Add Subscription</h2>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form className="subscription-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="serviceName" className="form-label">
            Service Name
          </label>
          <input
            id="serviceName"
            name="serviceName"
            type="text"
            className="form-input"
            placeholder="e.g. Netflix"
            value={form.serviceName}
            onChange={handleChange}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cost" className="form-label">
            Cost (₹)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            className="form-input"
            placeholder="e.g. 599"
            value={form.cost}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="billingCycle" className="form-label">
            Billing Cycle
          </label>
          <select
            id="billingCycle"
            name="billingCycle"
            className="form-input form-select"
            value={form.billingCycle}
            onChange={handleChange}
            required
            disabled={submitting}
          >
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nextRenewalDate" className="form-label">
            Next Renewal Date
          </label>
          <input
            id="nextRenewalDate"
            name="nextRenewalDate"
            type="date"
            className="form-input"
            value={form.nextRenewalDate}
            onChange={handleChange}
            required
            disabled={submitting}
          />
        </div>

        <button
          id="submit-subscription"
          type="submit"
          className="form-submit"
          disabled={submitting}
        >
          {submitting ? 'Adding…' : 'Add Subscription'}
        </button>
      </form>
    </section>
  );
}

export default SubscriptionForm;
