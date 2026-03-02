<script lang="ts">
  import { currentTrip, tripScore } from "$lib/features/trips/userTripStore"

  // Svelte 5 — derive reactively from stores
  let trip = $derived($currentTrip)
  let score = $derived($tripScore)
  let hasTrip = $derived(!!trip && !!trip.from && !!trip.to)

  function scoreLabel(s: number) {
    if (s >= 80) return { text: "Excellent", cls: "excellent" }
    if (s >= 60) return { text: "Good", cls: "good" }
    return { text: "Fair", cls: "fair" }
  }
</script>

<div class="trip-card">
  {#if hasTrip}
    <!-- ── Active trip ── -->
    <div class="card-head">
      <div>
        <div class="card-eyebrow">Next Trip</div>
        <div class="departure-time">{trip.departure || "Upcoming"}</div>
        <div class="route-line">
          <span>{trip.from}</span>
          <span class="route-arrow">→</span>
          <span>{trip.to}</span>
        </div>
      </div>

      {#if score != null}
        {@const s = scoreLabel(score)}
        <div class="score-pill">
          <span class="score-label">Trip Score</span>
          <span class="score-number {s.cls}">{score}</span>
          <span class="score-badge {s.cls}">{s.text}</span>
        </div>
      {/if}
    </div>

    <!-- Details -->
    <div class="details-strip">
      {#if trip.duration}
        <div class="detail-chip">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" /><polyline
              points="12 6 12 12 16 14"
            />
          </svg>
          <strong>{trip.duration}</strong>
        </div>
      {/if}
      {#if trip.transfers != null}
        <div class="chip-sep"></div>
        <div class="detail-chip">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="17 1 21 5 17 9" /><path
              d="M3 11V9a4 4 0 014-4h14"
            /><polyline points="7 23 3 19 7 15" /><path
              d="M21 13v2a4 4 0 01-4 4H3"
            />
          </svg>
          <strong>{trip.transfers}</strong>
          transfer{trip.transfers === 1 ? "" : "s"}
        </div>
      {/if}
    </div>

    <!-- Delay -->
    {#if trip.delay > 0}
      <div class="delay-banner">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" /><line
            x1="12"
            y1="17"
            x2="12.01"
            y2="17"
          />
        </svg>
        {trip.delay} min delay expected
      </div>
    {/if}
  {:else}
    <!-- ── Empty state ── -->
    <div class="empty-state">
      <div class="empty-icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div class="empty-title">No trip planned yet</div>
      <p class="empty-sub">Use the planner to set up your next journey.</p>
    </div>
  {/if}
</div>

<style>
  /* ── Card shell ── */
  .trip-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 200px;
    transition:
      border-color 0.25s,
      box-shadow 0.25s;
  }
  .trip-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
  }

  /* Accent line */
  .trip-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.5),
      transparent
    );
  }

  /* Corner glow */
  .trip-card::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 200px;
    height: 120px;
    background: radial-gradient(
      ellipse at 0% 0%,
      rgba(242, 101, 34, 0.06),
      transparent 70%
    );
    pointer-events: none;
  }

  /* ── Header row ── */
  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .card-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 5px;
  }

  .departure-time {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
  }

  .route-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .route-arrow {
    color: var(--orange);
    font-size: 0.75rem;
  }

  /* Score pill */
  .score-pill {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }
  .score-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .score-number {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .score-badge {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 100px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .score-badge.excellent {
    background: rgba(0, 176, 155, 0.12);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.25);
  }
  .score-badge.good {
    background: rgba(96, 165, 250, 0.1);
    color: #60a5fa;
    border: 1px solid rgba(96, 165, 250, 0.22);
  }
  .score-badge.fair {
    background: rgba(250, 204, 21, 0.1);
    color: #facc15;
    border: 1px solid rgba(250, 204, 21, 0.22);
  }
  .score-number.excellent {
    color: var(--teal);
  }
  .score-number.good {
    color: #60a5fa;
  }
  .score-number.fair {
    color: #facc15;
  }

  /* ── Details strip ── */
  .details-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .detail-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    color: var(--text-2);
  }
  .detail-chip svg {
    color: var(--text-3);
    flex-shrink: 0;
  }
  .detail-chip strong {
    color: var(--text-1);
    font-weight: 700;
  }

  .chip-sep {
    width: 1px;
    height: 14px;
    background: var(--rim-2);
    flex-shrink: 0;
  }

  /* ── Delay banner ── */
  .delay-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #f87171;
  }

  /* ── Empty state ── */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    gap: 10px;
  }
  .empty-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .empty-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-2);
  }
  .empty-sub {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
  }
</style>
