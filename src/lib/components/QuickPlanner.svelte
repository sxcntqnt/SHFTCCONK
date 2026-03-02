<script lang="ts">
  import { currentTrip, planMockTrip } from "$lib/features/trips/userTripStore"

  let from = $state("")
  let to = $state("")
  let mode = $state("transit")
  let loading = $state(false)

  const modes = [
    {
      value: "transit",
      label: "Matatu",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    },
    {
      value: "bike",
      label: "Boda",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 000-2h-3l-3 10h7"/><path d="M9 11l1.5-5.5"/></svg>`,
    },
    {
      value: "car",
      label: "Drive",
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h10l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
    },
  ]

  async function planTrip() {
    if (!from.trim() || !to.trim()) return
    loading = true
    try {
      const trip = planMockTrip(from, to, mode)
      currentTrip.set(trip)
    } catch (err) {
      console.error("Trip planning failed:", err)
    } finally {
      loading = false
    }
  }

  let canPlan = $derived(
    !loading && from.trim().length > 0 && to.trim().length > 0,
  )
</script>

<div class="planner-card">
  <div>
    <div class="card-eyebrow">Quick Planner</div>
    <div class="card-title">Plan Your Journey</div>
  </div>

  <!-- Origin + destination -->
  <div class="input-stack">
    <div class="input-wrap">
      <span class="input-icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <circle cx="12" cy="12" r="4" /><circle
            cx="12"
            cy="12"
            r="1"
            fill="currentColor"
          />
        </svg>
      </span>
      <input
        class="field"
        bind:value={from}
        placeholder="From — e.g. Westlands"
        autocomplete="off"
        disabled={loading}
      />
    </div>

    <div class="input-connector"><div class="connector-line"></div></div>

    <div class="input-wrap">
      <span class="input-icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"
          />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <input
        class="field"
        bind:value={to}
        placeholder="To — e.g. CBD"
        autocomplete="off"
        disabled={loading}
      />
    </div>
  </div>

  <!-- Mode selector -->
  <div class="mode-row">
    {#each modes as m}
      <button
        class="mode-btn {mode === m.value ? 'selected' : ''}"
        onclick={() => (mode = m.value)}
        disabled={loading}
      >
        {@html m.icon}
        {m.label}
      </button>
    {/each}
  </div>

  <!-- Plan button -->
  <button class="plan-btn" onclick={planTrip} disabled={!canPlan}>
    {#if loading}
      <span class="btn-spinner"></span>
      Planning…
    {:else}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
      Plan Trip
    {/if}
  </button>
</div>

<style>
  /* ── Card shell ── */
  .planner-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }

  /* Corner glow */
  .planner-card::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    width: 160px;
    height: 120px;
    background: radial-gradient(
      ellipse at 100% 100%,
      rgba(0, 176, 155, 0.06),
      transparent 70%
    );
    pointer-events: none;
  }

  /* ── Header ── */
  .card-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 2px;
  }
  .card-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  /* ── Input pair ── */
  .input-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon {
    position: absolute;
    left: 12px;
    color: var(--text-3);
    pointer-events: none;
    flex-shrink: 0;
  }
  .field {
    width: 100%;
    padding: 11px 12px 11px 36px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-1);
    outline: none;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .field::placeholder {
    color: var(--text-3);
  }
  .field:focus {
    border-color: rgba(242, 101, 34, 0.4);
    background: rgba(255, 255, 255, 0.06);
  }
  .field:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Connector dot between inputs */
  .input-connector {
    display: flex;
    justify-content: flex-start;
    padding-left: 17px;
    margin: -3px 0;
  }
  .connector-line {
    width: 1px;
    height: 10px;
    background: var(--rim-2);
    border-radius: 1px;
  }

  /* ── Mode selector ── */
  .mode-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 9px 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-3);
    cursor: pointer;
    transition:
      background 0.18s,
      border-color 0.18s,
      color 0.18s;
  }
  .mode-btn :global(svg) {
    opacity: 0.5;
    transition: opacity 0.18s;
  }
  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-2);
  }
  .mode-btn.selected {
    background: rgba(242, 101, 34, 0.1);
    border-color: rgba(242, 101, 34, 0.3);
    color: var(--orange);
  }
  .mode-btn.selected :global(svg) {
    opacity: 1;
  }

  /* ── Plan button ── */
  .plan-btn {
    width: 100%;
    padding: 13px;
    background: var(--orange);
    color: #fff;
    border: none;
    border-radius: 13px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.25);
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.15s;
  }
  .plan-btn:hover:not(:disabled) {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.38);
    transform: translateY(-1px);
  }
  .plan-btn:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  /* Loading spinner inside button */
  .btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
