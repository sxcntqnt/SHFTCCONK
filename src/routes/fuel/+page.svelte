<script lang="ts">
  import { user } from '$lib/features/auth/stores/auth';
  import type { Role } from '$lib/features/auth/stores/auth';

  let fuelData: Record<string, string | number> = {};
  let loading = false;
  let errorMessage = '';
  let filterQuery = '';

  async function loadFuelData() {
    loading = true;
    errorMessage = '';
    try {
      // Simulate API delay — replace with real fetch later
      await new Promise(r => setTimeout(r, 900));

      const role = $user.role as Role;

      switch (role) {
        case 'DRIVER':
          fuelData = {
            'Fuel Consumed': '120 L',
            'Avg. Fuel per Trip': '5 L',
            'Cost': 'KSh 9,500',
            'Efficiency': '12 km/L',
            'Last Refuel': 'Feb 15, 2026'
          };
          break;
        case 'CONDUCTOR':
          fuelData = {
            'Fuel Distributed': '450 L',
            'Trips Assisted': '18',
            'Cost Distributed': 'KSh 42,500',
            'Vehicles Supported': '3'
          };
          break;
        case 'MANAGER':
        case 'FLEET_MANAGER':
          fuelData = {
            'Total Fuel Used (Fleet)': '3,840 L',
            'Fleet Avg. Efficiency': '10.8 km/L',
            'Total Fuel Cost': 'KSh 412,000',
            'Vehicles Active': '42',
            'Trips This Month': '318',
            'Alerts': '7 high-consumption vehicles'
          };
          break;
        case 'OWNER':
          fuelData = {
            'Total Fuel Expenditure': 'KSh 1,284,000',
            'Fuel Cost % of Revenue': '14.8%',
            'Overall Fleet Efficiency': '11.2 km/L',
            'Total Liters Purchased': '12,650 L',
            'Savings vs Last Month': '+KSh 92,000',
            'Active Vehicles': '87',
            'Organizations/Fleets': '4'
          };
          break;
        default:
          fuelData = { note: 'Fuel data not available for your role.' };
      }
    } catch (err) {
      console.error(err);
      errorMessage = 'Failed to load fuel data — please try again';
    } finally {
      loading = false;
    }
  }

  $: if ($user.role) loadFuelData();
</script>

<div class="w-full max-w-6xl">
  <!-- Filter bar -->
  <div class="search mb-12 w-full max-w-md mx-auto">
    <input
      placeholder="Filter by period (e.g., this month, Q1, 2025)…"
      bind:value={filterQuery}
      disabled={loading}
      on:keydown={(e) => e.key === 'Enter' && loadFuelData()}
    />
    <button on:click={loadFuelData} disabled={loading}>
      {loading ? '…' : 'Refresh'}
    </button>
  </div>

  {#if errorMessage}
    <div class="error mb-8 text-center">{errorMessage}</div>
  {/if}

  {#if loading}
    <div class="loading mt-20 text-center">Loading your fuel data…</div>
  {:else if 'note' in fuelData}
    <div class="empty mt-10 text-center">{fuelData.note}</div>
  {:else}
    <div class="grid gap-8" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      {#each Object.entries(fuelData) as [label, value]}
        <div class="analytic-card">
          <div class="value">{value}</div>
          <div class="label">{label}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search {
    display: flex;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 9999px;
    backdrop-filter: blur(24px);
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  }

  .search input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-size: 1.1rem;
  }

  .search input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .search button {
    padding: 10px 28px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.18);
    color: white;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .search button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .search button:disabled {
    opacity: 0.4;
  }

  .analytic-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 32px 24px;
    text-align: center;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .analytic-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
  }

  .value {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -1px;
    background: linear-gradient(to bottom, #ffffff, #dbeafe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .label {
    font-size: 1rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
  }

  .loading, .empty {
    font-size: 1.25rem;
    opacity: 0.9;
    text-align: center;
    color: #ffdddd;
  }
</style>