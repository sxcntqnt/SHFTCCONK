<script lang="ts">
  import { goto } from "$app/navigation"
  import { authStore, ROLES } from "$lib/features/auth/stores/auth"
  import posthog from "posthog-js"

  // ── Types ─────────────────────────────────────────────────────────
  type PassengerItem = {
    id: string
    route: string
    sacco: string
    eta: string
    etaMinutes: number
    stage: string
    status: "Approaching" | "On Route" | "At Stage" | "Delayed"
    capacity: string
    occupancy: number // 0–100 percentage
    pricePerSeat: number
  }

  type BusinessItem = {
    reg: string
    driver: string
    fuel: number // 0–100 percentage
    status: "Active" | "Idle" | "Off Route" | "Maintenance"
    revenue: string
    trips: number
    route: string
  }

  // ── Derived role state ─────────────────────────────────────────────
  let isPassenger = $derived($authStore?.role === ROLES.PASSENGER)
  let isBusiness = $derived(
    [
      ROLES.OWNER,
      ROLES.ORGANIZATION,
      ROLES.ADMIN,
      ROLES.DRIVER,
      ROLES.OPERATIONS_MANAGER,
      ROLES.ROUTE_SUPERVISOR,
    ].includes($authStore?.role as any),
  )

  // ── Sample data ───────────────────────────────────────────────────
  const passengerItems: PassengerItem[] = [
    {
      id: "matatu-001",
      route: "111",
      sacco: "SUPERMETRO",
      eta: "3 min",
      etaMinutes: 3,
      stage: "T-Mall",
      status: "Approaching",
      capacity: "14/18",
      occupancy: 78,
      pricePerSeat: 20,
    },
    {
      id: "matatu-002",
      route: "125",
      sacco: "NICCO",
      eta: "7 min",
      etaMinutes: 7,
      stage: "CBD",
      status: "On Route",
      capacity: "8/18",
      occupancy: 44,
      pricePerSeat: 25,
    },
    {
      id: "matatu-003",
      route: "58",
      sacco: "CITI HOPPA",
      eta: "12 min",
      etaMinutes: 12,
      stage: "Westlands",
      status: "On Route",
      capacity: "16/18",
      occupancy: 89,
      pricePerSeat: 30,
    },
    {
      id: "matatu-004",
      route: "46",
      sacco: "FORWARD",
      eta: "18 min",
      etaMinutes: 18,
      stage: "Ngong Rd",
      status: "Delayed",
      capacity: "4/18",
      occupancy: 22,
      pricePerSeat: 20,
    },
  ]

  const businessItems: BusinessItem[] = [
    {
      reg: "KAA 123B",
      driver: "Peter K.",
      fuel: 78,
      status: "Active",
      revenue: "KES 4,200",
      trips: 6,
      route: "111",
    },
    {
      reg: "KBZ 441C",
      driver: "James M.",
      fuel: 45,
      status: "Active",
      revenue: "KES 3,100",
      trips: 4,
      route: "125",
    },
    {
      reg: "KCE 887A",
      driver: "Samuel O.",
      fuel: 22,
      status: "Idle",
      revenue: "KES 1,800",
      trips: 2,
      route: "58",
    },
    {
      reg: "KDA 302F",
      driver: "David W.",
      fuel: 91,
      status: "Off Route",
      revenue: "KES 5,600",
      trips: 8,
      route: "46",
    },
  ]

  let items: (PassengerItem | BusinessItem)[] = $state([])
  $effect(() => {
    items = isPassenger ? passengerItems : businessItems
  })

  // ── Actions ────────────────────────────────────────────────────────
  function goToReserve(matatu: PassengerItem) {
    // Track when a passenger selects a matatu from the live feed
    posthog.capture("matatu_selected_from_feed", {
      matatu_id: matatu.id,
      route: matatu.route,
      sacco: matatu.sacco,
      status: matatu.status,
      eta_minutes: matatu.etaMinutes,
      occupancy: matatu.occupancy,
      price_per_seat: matatu.pricePerSeat,
    })
    goto(`/reserve/${matatu.id}`, { replaceState: false })
  }

  // ── Helpers ────────────────────────────────────────────────────────
  const STATUS_CONFIG = {
    // Passenger
    Approaching: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.12)",
      border: "rgba(0,176,155,0.25)",
      pulse: true,
    },
    "On Route": {
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.10)",
      border: "rgba(96,165,250,0.22)",
      pulse: false,
    },
    "At Stage": {
      color: "var(--orange)",
      bg: "rgba(242,101,34,0.10)",
      border: "rgba(242,101,34,0.22)",
      pulse: true,
    },
    Delayed: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.10)",
      border: "rgba(248,113,113,0.22)",
      pulse: false,
    },
    // Business
    Active: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.12)",
      border: "rgba(0,176,155,0.25)",
      pulse: true,
    },
    Idle: {
      color: "#9ca3af",
      bg: "rgba(156,163,175,0.10)",
      border: "rgba(156,163,175,0.2)",
      pulse: false,
    },
    "Off Route": {
      color: "#f87171",
      bg: "rgba(248,113,113,0.10)",
      border: "rgba(248,113,113,0.22)",
      pulse: false,
    },
    Maintenance: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.10)",
      border: "rgba(250,204,21,0.22)",
      pulse: false,
    },
  } as const

  function statusCfg(s: string) {
    return STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.Idle
  }

  function fuelColor(pct: number) {
    if (pct > 50) return "var(--teal)"
    if (pct > 25) return "#facc15"
    return "#f87171"
  }

  function etaUrgency(mins: number) {
    if (mins <= 3) return "urgent"
    if (mins <= 8) return "soon"
    return "later"
  }

  // Corridor hash — placeholder; in production this comes from route data
  const polylineHash = "nairobi-cbd-westlands"
</script>

<svelte:head>
  <title
    >{isPassenger ? "Live Near You" : "Operations Overview"} — Matatu Pulse</title
  >
</svelte:head>

<div class="feed-page">
  <div class="feed-inner">
    <!-- ═══ HEADER ═══ -->
    <header class="feed-header">
      <div class="header-left">
        <div class="header-eyebrow">
          <span class="live-dot"></span>
          {isPassenger ? "Live Feed" : "Fleet Operations"}
        </div>
        <h1 class="feed-title">
          {#if isPassenger}
            Matatus <em>Near You</em>
          {:else}
            Operations <em>Overview</em>
          {/if}
        </h1>
        <p class="feed-sub">
          {isPassenger
            ? "Real-time arrivals on your corridor. Board smarter, wait less."
            : "Live fleet status, driver performance, and revenue across your routes."}
        </p>
      </div>

      <a href={`/feed/corridor/${polylineHash}`} class="corridor-btn">
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
        View Corridor Feed
      </a>
    </header>

    <!-- ═══ SUMMARY STRIP (operator mode) ═══ -->
    {#if isBusiness}
      <div class="summary-strip">
        {#each [{ label: "Active Vehicles", value: "3", sub: "of 4 in fleet", cls: "green" }, { label: "Today's Revenue", value: "KES 14.7k", sub: "+12% vs yesterday", cls: "orange" }, { label: "Total Trips", value: "20", sub: "across all vehicles", cls: "" }, { label: "Avg Fuel Level", value: "59%", sub: "1 vehicle low", cls: "" }] as s}
          <div class="summary-card">
            <div class="summary-label">{s.label}</div>
            <div class="summary-value {s.cls}">{s.value}</div>
            <div class="summary-sub">{s.sub}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ═══ CARD GRID ═══ -->
    <div class="card-grid">
      {#if items.length === 0}
        <div class="empty-state">
          <div class="empty-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="1" y="3" width="15" height="13" /><path
                d="M16 8h4l3 3v5h-7z"
              />
              <circle cx="5.5" cy="18.5" r="2.5" /><circle
                cx="18.5"
                cy="18.5"
                r="2.5"
              />
            </svg>
          </div>
          <div class="empty-title">
            No {isPassenger ? "vehicles near you" : "active fleet items"} right now
          </div>
          <p class="empty-sub">
            {isPassenger
              ? "Check back in a moment — vehicles update every 30 seconds."
              : "All vehicles may be off-duty or awaiting route assignment."}
          </p>
        </div>
      {:else}
        {#each items as item (isPassenger ? (item as PassengerItem).id : (item as BusinessItem).reg)}
          {@const cfg = statusCfg(item.status)}

          <div class="feed-card">
            <!-- Coloured top accent line -->
            <div
              class="card-accent"
              style="background: linear-gradient(90deg, transparent, {cfg.color}, transparent);"
            ></div>

            <!-- ── PASSENGER CARD ── -->
            {#if isPassenger}
              {@const p = item as PassengerItem}
              {@const urgency = etaUrgency(p.etaMinutes)}

              <div class="card-head">
                <div>
                  <span class="card-route-badge">Route {p.route}</span>
                  <div class="card-name">{p.sacco}</div>
                </div>
                <div
                  class="status-pill"
                  style="background:{cfg.bg}; border:1px solid {cfg.border}; color:{cfg.color};"
                >
                  <span
                    class="status-dot {cfg.pulse ? 'pulse' : ''}"
                    style="background:{cfg.color}; box-shadow:0 0 0 0 {cfg.color};"
                  ></span>
                  {p.status}
                </div>
              </div>

              <!-- ETA hero -->
              <div class="eta-block">
                <div>
                  <div class="eta-number {urgency}">{p.eta}</div>
                  <div class="eta-label">Arrives in</div>
                </div>
                <div class="eta-meta">
                  <div class="eta-stage">{p.stage}</div>
                  <div class="eta-label">Next stop</div>
                </div>
              </div>

              <!-- Occupancy -->
              <div class="occupancy-row">
                <span class="occupancy-label">Seats</span>
                <div class="occupancy-track">
                  <div
                    class="occupancy-fill {p.occupancy > 75 ? 'high' : ''}"
                    style="width:{p.occupancy}%"
                  ></div>
                </div>
                <span class="occupancy-count">{p.capacity}</span>
              </div>

              <!-- Price -->
              <div class="price-badge">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="1" x2="12" y2="23" /><path
                    d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                  />
                </svg>
                <span class="price-amount">KES {p.pricePerSeat}</span>
                <span>per seat</span>
              </div>

              <button
                class="card-btn reserve"
                onclick={() => goToReserve(p)}
                disabled={p.occupancy >= 95}
              >
                {#if p.occupancy >= 95}
                  Full — No Seats
                {:else}
                  Reserve a Seat
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                {/if}
              </button>

              <!-- ── BUSINESS CARD ── -->
            {:else}
              {@const b = item as BusinessItem}

              <div class="card-head">
                <div>
                  <span class="card-route-badge">Route {b.route}</span>
                  <div class="card-name">{b.reg}</div>
                </div>
                <div
                  class="status-pill"
                  style="background:{cfg.bg}; border:1px solid {cfg.border}; color:{cfg.color};"
                >
                  <span
                    class="status-dot {cfg.pulse ? 'pulse' : ''}"
                    style="background:{cfg.color};"
                  ></span>
                  {b.status}
                </div>
              </div>

              <!-- Key metrics grid -->
              <div class="metrics-grid">
                <div class="metric-cell">
                  <div class="metric-label">Driver</div>
                  <div class="metric-value">{b.driver}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-label">Revenue</div>
                  <div class="metric-value" style="color:var(--teal);">
                    {b.revenue}
                  </div>
                </div>
                <div class="metric-cell">
                  <div class="metric-label">Trips Today</div>
                  <div class="metric-value">{b.trips}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-label">Fuel</div>
                  <div class="metric-value" style="color:{fuelColor(b.fuel)};">
                    {b.fuel}%
                  </div>
                </div>
              </div>

              <!-- Fuel bar -->
              <div class="fuel-row">
                <span class="fuel-label">Fuel level</span>
                <div class="fuel-track">
                  <div
                    class="fuel-fill"
                    style="width:{b.fuel}%; background:{fuelColor(b.fuel)};"
                  ></div>
                </div>
                <span class="fuel-pct" style="color:{fuelColor(b.fuel)};"
                  >{b.fuel}%</span
                >
              </div>

              <button class="card-btn details">
                View Full Details
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  /* ═══════════════════════════════════════════════
     PAGE SHELL
  ═══════════════════════════════════════════════ */
  .feed-page {
    flex: 1;
    min-height: 100vh;
    background: var(--ink);
    padding: 0;
    position: relative;
  }

  /* Subtle atmospheric gradient */
  .feed-page::before {
    content: "";
    position: fixed;
    inset: 0;
    background:
      radial-gradient(
        ellipse 60% 40% at 0% 0%,
        rgba(242, 101, 34, 0.05),
        transparent 60%
      ),
      radial-gradient(
        ellipse 40% 30% at 100% 100%,
        rgba(0, 176, 155, 0.04),
        transparent 60%
      );
    pointer-events: none;
    z-index: 0;
  }

  .feed-inner {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 32px 80px;
  }

  /* ═══════════════════════════════════════════════
     HEADER
  ═══════════════════════════════════════════════ */
  .feed-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 40px;
    flex-wrap: wrap;
  }

  .header-left {
  }

  .header-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 10px;
  }

  /* Live pulse dot */
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--teal);
    box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.4);
    animation: live-pulse 2s ease-out infinite;
    flex-shrink: 0;
  }
  @keyframes live-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  .feed-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 3.5vw, 2.8rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.05;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .feed-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .feed-sub {
    font-size: 0.9rem;
    color: var(--text-3);
    line-height: 1.6;
    max-width: 480px;
  }

  /* Corridor CTA button */
  .corridor-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 20px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.3);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--orange);
    text-decoration: none;
    white-space: nowrap;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s;
    flex-shrink: 0;
  }
  .corridor-btn:hover {
    background: rgba(242, 101, 34, 0.16);
    border-color: rgba(242, 101, 34, 0.5);
    transform: translateY(-1px);
  }

  /* ═══════════════════════════════════════════════
     SUMMARY STRIP — business mode only
  ═══════════════════════════════════════════════ */
  .summary-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 32px;
  }

  .summary-card {
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    transition: border-color 0.2s;
  }
  .summary-card:hover {
    border-color: rgba(242, 101, 34, 0.2);
  }

  .summary-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .summary-value {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
    margin-bottom: 2px;
  }
  .summary-sub {
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .summary-value.green {
    color: var(--teal);
  }
  .summary-value.orange {
    color: var(--orange);
  }

  /* ═══════════════════════════════════════════════
     CARD GRID
  ═══════════════════════════════════════════════ */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  /* ── Base card ── */
  .feed-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.25s,
      transform 0.25s,
      box-shadow 0.25s;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .feed-card:hover {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  }

  /* Top accent line — colour matches status */
  .card-accent {
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
  }

  /* Subtle corner glow */
  .feed-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 160px;
    height: 100px;
    background: radial-gradient(
      ellipse at 0% 0%,
      rgba(242, 101, 34, 0.05),
      transparent 70%
    );
    pointer-events: none;
  }

  /* ── Card header ── */
  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .card-route-badge {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    padding: 3px 9px;
    border-radius: 100px;
    margin-bottom: 6px;
    display: inline-block;
  }

  .card-name {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
  }

  .status-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.pulse {
    animation: live-pulse 2s ease-out infinite;
  }

  /* ── ETA block (passenger) ── */
  .eta-block {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .eta-number {
    font-family: var(--font-display);
    font-size: 2.2rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1;
  }
  .eta-number.urgent {
    color: var(--teal);
  }
  .eta-number.soon {
    color: #60a5fa;
  }
  .eta-number.later {
    color: var(--text-2);
  }

  .eta-meta {
    text-align: right;
  }
  .eta-stage {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .eta-label {
    font-size: 0.68rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Occupancy bar */
  .occupancy-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }
  .occupancy-label {
    font-size: 0.72rem;
    color: var(--text-3);
    white-space: nowrap;
  }
  .occupancy-track {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 100px;
    overflow: hidden;
  }
  .occupancy-fill {
    height: 100%;
    border-radius: 100px;
    background: linear-gradient(90deg, var(--teal), #60a5fa);
    transition: width 0.6s ease;
  }
  .occupancy-fill.high {
    background: linear-gradient(90deg, #f26522, #f87171);
  }
  .occupancy-count {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
  }

  /* Price badge */
  .price-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-3);
    margin-bottom: 18px;
  }
  .price-amount {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--text-1);
  }

  /* ── Metrics block (business) ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }

  .metric-cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 11px;
    padding: 11px 12px;
  }
  .metric-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .metric-value {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-1);
  }

  /* Fuel bar */
  .fuel-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
  }
  .fuel-label {
    font-size: 0.68rem;
    color: var(--text-3);
  }
  .fuel-track {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 100px;
    overflow: hidden;
  }
  .fuel-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.6s ease;
  }
  .fuel-pct {
    font-size: 0.72rem;
    font-weight: 700;
    min-width: 30px;
    text-align: right;
  }

  /* ── Action button ── */
  .card-btn {
    width: 100%;
    padding: 13px;
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
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
    margin-top: auto;
  }

  .card-btn.reserve {
    background: var(--orange);
    color: #fff;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.25);
  }
  .card-btn.reserve:hover {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.4);
    transform: translateY(-1px);
  }
  .card-btn.reserve:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .card-btn.details {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--rim-2);
    color: var(--text-2);
  }
  .card-btn.details:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-1);
  }

  /* ── Empty state ── */
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    text-align: center;
  }
  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3);
    margin-bottom: 20px;
  }
  .empty-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-2);
    margin-bottom: 8px;
  }
  .empty-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── Staggered card entrance ── */
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .feed-card {
    animation: card-in 0.4s ease both;
  }
  .feed-card:nth-child(1) {
    animation-delay: 0.05s;
  }
  .feed-card:nth-child(2) {
    animation-delay: 0.1s;
  }
  .feed-card:nth-child(3) {
    animation-delay: 0.15s;
  }
  .feed-card:nth-child(4) {
    animation-delay: 0.2s;
  }
  .feed-card:nth-child(5) {
    animation-delay: 0.25s;
  }
  .feed-card:nth-child(6) {
    animation-delay: 0.3s;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .feed-inner {
      padding: 28px 20px 60px;
    }
    .summary-strip {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .feed-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .summary-strip {
      grid-template-columns: 1fr 1fr;
    }
    .card-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
