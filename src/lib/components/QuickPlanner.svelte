<script>
  import { currentTrip } from '$lib/stores/trips';
  import { planMockTrip } from '$lib/services/routing';

  let from = '';
  let to = '';
  let mode = 'transit';
  let loading = false;

  async function planTrip() {
    if (!from.trim() || !to.trim()) return;

    loading = true;

    try {
      // In a real app this would be an API call – here we're using the mock
      const trip = planMockTrip(from, to, mode);
      currentTrip.set(trip);
    } catch (err) {
      console.error('Trip planning failed:', err);
      // Optional: show error message to user
    } finally {
      loading = false;
    }
  }
</script>

<div class="card">
  <input
    bind:value={from}
    placeholder="From"
    autocomplete="off"
    autocapitalize="off"
    disabled={loading}
  />

  <input
    bind:value={to}
    placeholder="To"
    autocomplete="off"
    autocapitalize="off"
    disabled={loading}
  />

  <select bind:value={mode} disabled={loading}>
    <option value="transit">Transit</option>
    <option value="bike">Bike</option>
    <option value="car">Car</option>
  </select>

  <button
    on:click={planTrip}
    disabled={loading || !from.trim() || !to.trim()}
  >
    {loading ? 'Planning…' : 'Plan Trip'}
  </button>
</div>

<style>
  .card {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    max-width: 400px;
    margin: 0 auto;
  }

  input,
  select {
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input::placeholder {
    color: #9ca3af;
  }

  select {
    appearance: none;
    background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' viewBox='0 0 14 14'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m1 4 6 6 6-6'/%3E%3C/svg%3E")
      no-repeat right 1rem center / 14px;
    padding-right: 2.5rem;
  }

  button {
    background: #2563eb;
    color: white;
    padding: 0.8rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #1d4ed8;
  }

  button:disabled {
    background: #93c5fd;
    cursor: not-allowed;
    opacity: 0.7;
  }
</style>