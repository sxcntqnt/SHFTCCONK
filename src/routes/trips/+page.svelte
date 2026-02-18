<script lang="ts">
  import { user } from '$lib/auth'; 
  import type { Role } from '$lib/auth';

  let tripData: Record<string, string | number> = {};
  let loading = false;
  let errorMessage = '';
  let filterQuery = '';

  async function loadAnalytics() {
    loading = true;
    errorMessage = '';
    try {
      await new Promise(r => setTimeout(r, 900));

      switch ($user.role as Role) {
        case 'PASSENGER':
          tripData = {
            'Total distance': '150 km',
            'Trips taken': '10',
            'Total spent': 'KSh 4,800',
            'Avg. trip time': '32 min'
          };
          break;
        case 'DRIVER':
          tripData = {
            'Distance driven': '620 km',
            'Trips completed': '24',
            'Earnings': 'KSh 18,200',
            'Avg. rating': '4.7 ★'
          };
          break;
        case 'CONDUCTOR':
          tripData = {
            'Passengers handled': '285',
            'Trips assisted': '18',
            'Collections': 'KSh 42,500'
          };
          break;
        default:
          tripData = { note: 'Analytics not available for this role yet.' };
      }
    } catch (err) {
      console.error(err);
      errorMessage = 'Failed to load analytics — please try again';
    } finally {
      loading = false;
    }
  }

  $: if ($user.role) loadAnalytics();
</script>

<div class="trips-bg min-h-screen w-full flex flex-col items-center px-5 pb-20 pt-[env(safe-area-inset-top)]">
  <!-- Filter bar -->
  <div class="search mb-12 w-full max-w-md">
    <input
      placeholder="Filter by period (e.g. this month)…"
      bind:value={filterQuery}
      disabled={loading}
      on:keydown={(e) => e.key === 'Enter' && loadAnalytics()}
    />
    <button on:click={loadAnalytics} disabled={loading}>
      {loading ? '…' : 'Refresh'}
    </button>
  </div>

  <!-- Error message -->
  {#if errorMessage}
    <div class="error mb-8 text-center">{errorMessage}</div>
  {/if}

  <h1 class="title mb-12">Trip Analytics</h1>

  <!-- Loading / Empty / Data -->
  {#if loading}
    <div class="loading mt-20 text-center">Loading your trips…</div>
  {:else if 'note' in tripData}
    <div class="empty mt-10 text-center">{tripData.note}</div>
  {:else}
    <div class="grid gap-8 w-full max-w-6xl" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      {#each Object.entries(tripData) as [label, value]}
        <div class="analytic-card">
          <div class="value">{value}</div>
          <div class="label">{label}</div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Footer info -->
  <p class="footer-info mt-16">
    {$user.name || 'User'} • {$user.role} • Updated {new Date().toLocaleDateString()}
  </p>
</div>

<style>
  .trips-bg {
    background:
      radial-gradient(1400px 800px at 50% -20%, rgba(255, 255, 255, 0.18), transparent),
      linear-gradient(180deg, #1e3a8a 0%, #1e40af 30%, #111827 100%);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media (prefers-color-scheme: light) {
    .trips-bg {
      background:
        radial-gradient(1400px 800px at 50% -20%, rgba(0, 0, 0, 0.06), transparent),
        linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #1e40af 100%);
    }
  }

  .title {
    font-size: 3rem;
    font-weight: 700;
    text-align: center;
    letter-spacing: -0.03em;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    background: linear-gradient(to bottom, #ffffff, #e0f2fe);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .error, .loading, .empty {
    font-size: 1.25rem;
    max-width: 420px;
    line-height: 1.6;
    opacity: 0.9;
    text-align: center;
    color: #ffdddd;
  }

  .search {
    display: flex;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 9999px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-size: 1.1rem;
  }
  input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  button {
    padding: 10px 28px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.18);
    color: white;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }
  button:disabled {
    opacity: 0.4;
  }

.analytic-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px; /* space between value and label */
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
  line-height: 1.1; /* reduced to prevent overlap */
  letter-spacing: -1px;
  background: linear-gradient(to bottom, #ffffff, #dbeafe);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.label {
  font-size: 1rem; /* slightly smaller */
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap; /* prevent wrapping under value */
}

  .footer-info {
    font-size: 0.9rem;
    margin-top: 3rem;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
  }
</style>
