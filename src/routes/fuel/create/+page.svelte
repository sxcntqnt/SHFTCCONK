<script lang="ts">
  import { enhance } from '$app/forms';

  let formError = '';
  let successMessage = '';
  let submitting = false;

  let formValues = $state({
    date: '',
    vehicleId: '',
    odometer: '',
    liters: '',
    pricePerLiter: '',
    totalCost: '',
    notes: ''
  });

  $effect(() => {
    if (formValues.liters && formValues.pricePerLiter) {
      const total = Number(formValues.liters) * Number(formValues.pricePerLiter);
      formValues.totalCost = total ? total.toFixed(2) : '';
    } else {
      formValues.totalCost = '';
    }
  });
</script>

<div class="w-full max-w-2xl">
  <div class="card p-8">
    <h2 class="text-2xl font-bold mb-6 text-center">Record New Fuel Entry</h2>

    <form
      method="POST"
      action="?/addFuel"
      use:enhance={() => {
        submitting = true;
        formError = '';
        return async ({ result }) => {
          submitting = false;
          if (result.type === 'success') {
            successMessage = 'Fuel entry recorded successfully!';
            formValues = { date: '', vehicleId: '', odometer: '', liters: '', pricePerLiter: '', totalCost: '', notes: '' };
            setTimeout(() => (successMessage = ''), 5000);
          } else if (result.type === 'failure') {
            formError = result.data?.message || 'Failed to save entry';
          }
        };
      }}
    >
      <div class="grid gap-5 md:grid-cols-2">
        <label class="block">
          <span>Date & Time</span>
          <input type="datetime-local" name="date" bind:value={formValues.date} required />
        </label>

        <label class="block">
          <span>Vehicle ID / Reg. No.</span>
          <input type="text" name="vehicleId" placeholder="KAA 123B" bind:value={formValues.vehicleId} required />
        </label>

        <label class="block">
          <span>Odometer (km)</span>
          <input type="number" name="odometer" placeholder="145280" bind:value={formValues.odometer} required min="0" />
        </label>

        <label class="block">
          <span>Liters Added</span>
          <input type="number" step="0.01" name="liters" placeholder="45.5" bind:value={formValues.liters} required min="0.1" />
        </label>

        <label class="block">
          <span>Price per Liter (KSh)</span>
          <input type="number" step="0.01" name="pricePerLiter" placeholder="189.50" bind:value={formValues.pricePerLiter} required min="1" />
        </label>

        <label class="block">
  <span>Total Cost (KSh)</span>
  <input
    type="number"
    step="0.01"
    name="totalCost"
    placeholder="auto-calculated"
    bind:value={formValues.totalCost}
    readonly
    class="bg-slate-900/40 border-slate-700/50 text-slate-300 cursor-not-allowed"
/>
</label>
      </div>

      <label class="block mt-5">
        <span>Notes / Station</span>
        <input type="text" name="notes" placeholder="Shell Westlands • Pump 4" bind:value={formValues.notes} />
      </label>

      {#if formError}
        <div class="error mt-6 text-center">{formError}</div>
      {/if}
      {#if successMessage}
        <div class="success mt-6 text-center">{successMessage}</div>
      {/if}

      <button type="submit" class="submit-btn mt-8 w-full" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Fuel Entry'}
      </button>
    </form>
  </div>
</div>

<style>
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 1.05rem;
  }

  input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }

  .submit-btn {
    padding: 14px;
    border-radius: 9999px;
    background: linear-gradient(45deg, #3b82f6, #60a5fa);
    color: white;
    font-weight: 600;
    font-size: 1.1rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  input[readonly] {
    background: rgba(30, 58, 138, 0.4);
    color: rgba(255, 255, 255, 0.7);
  }
</style>