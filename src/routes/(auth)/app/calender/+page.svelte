<!-- src/routes/commute/+page.svelte -->
<script lang="ts">
  import DatePicker from "$lib/components/DatePicker.svelte"
  import { enhance } from "$app/forms"
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  let selectedDate = $state(new Date())
  let showSuccess = $state(false)

  let selectedDateStr = $derived(selectedDate.toISOString().split("T")[0])

  let dailyTrips = $derived(
    data.activities.filter((trip) => trip.date === selectedDateStr),
  )

  function handleSuccess() {
    showSuccess = true
    setTimeout(() => (showSuccess = false), 3000)
  }

  const MODE_ICON: Record<string, string> = {
    Car: "🚗",
    Train: "🚄",
    Bike: "🚲",
    Walk: "🚶",
  }
</script>

<svelte:head>
  <title>Commute Journeys — Matatu Pulse</title>
</svelte:head>

<div class="page">
  <!-- Atmospheric blobs -->
  <div class="atm atm-1" aria-hidden="true"></div>
  <div class="atm atm-2" aria-hidden="true"></div>

  <!-- ── Page header ── -->
  <div class="page-header">
    <div class="eyebrow">
      <span class="eyebrow-dot"></span>Fleet Management
    </div>
    <h1 class="page-title">Commute <em>Journeys</em></h1>
    <p class="page-sub">Plan and review your daily trips across dates.</p>
  </div>

  <div class="body">
    <!-- ── Left column: calendar + date meta ── -->
    <div class="left-col">
      <!-- Today chip -->
      <div class="today-row">
        <button class="today-btn" onclick={() => (selectedDate = new Date())}>
          <span class="today-dot"></span>
          Jump to today
        </button>
        <span class="today-label">
          {new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>
      </div>

      <!-- Calendar panel -->
      <div class="panel">
        <div class="panel::before"></div>
        <div class="panel-head">
          <div class="panel-ey">Date Selection</div>
          <div class="panel-ti">Pick a Day</div>
        </div>
        <div class="dp-wrap">
          <DatePicker bind:selected={selectedDate} />
        </div>
        <p class="hint">Select any date to view or log commutes</p>
      </div>

      <!-- Stat chip -->
      <div class="stat-chip">
        <div class="stat-num">{dailyTrips.length}</div>
        <div class="stat-label">
          trip{dailyTrips.length !== 1 ? "s" : ""} on selected day
        </div>
      </div>
    </div>

    <!-- ── Right column: trips + form ── -->
    <div class="right-col">
      <!-- Date heading -->
      <div class="date-head">
        <div>
          <p class="date-eye">YOUR JOURNEYS ON</p>
          <h2 class="date-title">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(selectedDate)}
          </h2>
        </div>
        <div class="trip-count">
          <span class="trip-num">{dailyTrips.length}</span>
          <span class="trip-unit">trips</span>
        </div>
      </div>

      <!-- Trip list -->
      {#if dailyTrips.length > 0}
        <div class="trip-list">
          {#each dailyTrips as trip (trip.id)}
            <div class="trip-card">
              <div class="trip-time-col">
                <div class="trip-time">{trip.time}</div>
                <div class="trip-commute-label">commute</div>
              </div>
              <div class="trip-body">
                <div class="trip-route">
                  <span class="trip-stop">{trip.from}</span>
                  <div class="trip-line" aria-hidden="true">
                    <div class="trip-line-fill"></div>
                    <svg
                      width="7"
                      height="7"
                      viewBox="0 0 7 7"
                      aria-hidden="true"
                    >
                      <circle
                        cx="3.5"
                        cy="3.5"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.2"
                      />
                    </svg>
                  </div>
                  <span class="trip-stop">{trip.to}</span>
                </div>
                <div class="trip-meta">
                  <span class="trip-mode-pill">
                    {MODE_ICON[trip.mode] ?? "🚌"}
                    {trip.mode}
                  </span>
                  {#if trip.notes}
                    <span class="trip-notes">• {trip.notes}</span>
                  {/if}
                </div>
              </div>
              <button class="trip-delete" aria-label="Delete trip">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </div>
          <p class="empty-label">No commutes scheduled</p>
          <p class="empty-sub">Add your first journey using the form below</p>
        </div>
      {/if}

      <!-- ── Add journey form ── -->
      <div class="panel form-panel">
        <div class="panel-head">
          <div class="panel-ey">Log Journey</div>
          <div class="panel-ti">
            Add New Trip ·
            <em
              style="font-style:normal;color:var(--orange);font-size:0.78rem;"
            >
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
              }).format(selectedDate)}
            </em>
          </div>
        </div>

        <form
          method="POST"
          action="?/add"
          use:enhance
          onsubmit={handleSuccess}
          class="form-grid"
        >
          <input type="hidden" name="date" value={selectedDateStr} />

          <div class="field">
            <label class="field-label" for="f-time">Departure Time</label>
            <input
              id="f-time"
              class="field-input"
              type="time"
              name="time"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="f-mode">Transport Mode</label>
            <select id="f-mode" class="field-input" name="mode" required>
              <option value="Car">🚗 Car</option>
              <option value="Train">🚄 Train</option>
              <option value="Bike">🚲 Bike</option>
              <option value="Walk">🚶 Walk</option>
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="f-from">From</label>
            <input
              id="f-from"
              class="field-input"
              type="text"
              name="from"
              placeholder="Home / Office"
              required
              value="Home"
            />
          </div>

          <div class="field">
            <label class="field-label" for="f-to">To</label>
            <input
              id="f-to"
              class="field-input"
              type="text"
              name="to"
              placeholder="Office / Home"
              required
              value="Office"
            />
          </div>

          <div class="field field-full">
            <label class="field-label" for="f-notes"
              >Notes <span style="opacity:0.5">(optional)</span></label
            >
            <textarea
              id="f-notes"
              class="field-input"
              name="notes"
              rows="2"
              placeholder="Traffic heavy today • Take scenic route"
            ></textarea>
          </div>

          <button type="submit" class="submit-btn field-full">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" /><line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
              />
            </svg>
            Save Journey
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- ── Toast ── -->
  {#if showSuccess}
    <div class="toast" role="status">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Journey saved successfully
    </div>
  {/if}
</div>

<style>
  /* ── Page shell ── */
  .page {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    background: var(--ink);
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  /* Atmospheric blobs */
  .atm {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }
  .atm-1 {
    width: 480px;
    height: 480px;
    top: -120px;
    right: -100px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
    filter: blur(60px);
  }
  .atm-2 {
    width: 380px;
    height: 380px;
    bottom: -80px;
    left: -80px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
    filter: blur(60px);
  }

  /* ── Page header ── */
  .page-header {
    padding: 28px 32px 20px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o 2s ease-out infinite;
  }
  @keyframes pulse-o {
    0% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(242, 101, 34, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0);
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange);
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── Body layout ── */
  .body {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 16px;
    padding: 0 32px 40px;
    flex: 1;
    position: relative;
    z-index: 1;
    align-items: start;
  }

  /* ── Left col ── */
  .left-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: 24px;
  }

  .today-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .today-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 100px;
    font-family: var(--font-body);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--orange);
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.12s;
  }
  .today-btn:hover {
    background: rgba(242, 101, 34, 0.14);
    transform: translateY(-1px);
  }
  .today-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--orange);
  }
  .today-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  /* Panel */
  .panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .panel-head {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .panel-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .panel-ti {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  .dp-wrap {
    padding: 14px 14px 8px;
  }
  .hint {
    padding: 0 14px 12px;
    font-size: 0.67rem;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* Stat chip */
  .stat-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 12px;
  }
  .stat-num {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--orange);
    line-height: 1;
  }
  .stat-label {
    font-size: 0.72rem;
    color: var(--text-3);
    line-height: 1.4;
  }

  /* ── Right col ── */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Date heading */
  .date-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .date-eye {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 5px;
  }
  .date-title {
    font-family: var(--font-display);
    font-size: clamp(1.1rem, 2vw, 1.5rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
  }
  .trip-count {
    text-align: right;
    flex-shrink: 0;
  }
  .trip-num {
    font-family: var(--font-display);
    font-size: 3rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    color: var(--orange);
    display: block;
    line-height: 1;
  }
  .trip-unit {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  /* Trip list */
  .trip-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .trip-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 14px;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .trip-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .trip-time-col {
    text-align: right;
    flex-shrink: 0;
    min-width: 52px;
  }
  .trip-time {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
  }
  .trip-commute-label {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--teal);
    margin-top: 2px;
  }

  .trip-body {
    flex: 1;
    min-width: 0;
  }
  .trip-route {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
  }
  .trip-stop {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .trip-line {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 24px;
    color: rgba(255, 255, 255, 0.15);
  }
  .trip-line-fill {
    flex: 1;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(242, 101, 34, 0.2),
      rgba(0, 176, 155, 0.2)
    );
  }
  .trip-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .trip-mode-pill {
    padding: 2px 8px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-2);
  }
  .trip-notes {
    font-size: 0.65rem;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trip-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.15);
    color: #f87171;
    cursor: pointer;
    flex-shrink: 0;
    opacity: 0;
    transition:
      opacity 0.15s,
      background 0.15s,
      transform 0.12s;
  }
  .trip-card:hover .trip-delete {
    opacity: 1;
  }
  .trip-delete:hover {
    background: rgba(248, 113, 113, 0.15);
    transform: scale(1.08);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 36px 20px;
    background: rgba(255, 255, 255, 0.015);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    text-align: center;
  }
  .empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 4px;
  }
  .empty-label {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-2);
  }
  .empty-sub {
    font-size: 0.72rem;
    color: var(--text-3);
  }

  /* ── Form ── */
  .form-panel {
    flex-shrink: 0;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 14px 14px 16px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field-full {
    grid-column: 1 / -1;
  }
  .field-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .field-input {
    width: 100%;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--text-1);
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    resize: none;
  }
  .field-input::placeholder {
    color: var(--text-3);
  }
  .field-input:focus {
    border-color: rgba(242, 101, 34, 0.45);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }
  .field-input option {
    background: #1a1a2e;
    color: white;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 20px;
    margin-top: 4px;
    border-radius: 11px;
    background: rgba(242, 101, 34, 0.15);
    border: 1px solid rgba(242, 101, 34, 0.3);
    color: var(--orange);
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.12s,
      box-shadow 0.15s;
    letter-spacing: 0.02em;
  }
  .submit-btn:hover {
    background: rgba(242, 101, 34, 0.22);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.2);
  }
  .submit-btn:active {
    transform: scale(0.98);
  }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: rgba(0, 176, 155, 0.15);
    border: 1px solid rgba(0, 176, 155, 0.3);
    border-radius: 100px;
    backdrop-filter: blur(16px);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--teal);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: toast-in 0.35s ease both;
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .body {
      grid-template-columns: 1fr;
      padding: 0 20px 32px;
    }
    .left-col {
      position: static;
    }
    .page-header {
      padding: 22px 20px 16px;
    }
  }
  @media (max-width: 600px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    .date-head {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
