<script lang="ts">
  import { onMount } from "svelte"

  // ── Types ──────────────────────────────────────────────────────────────
  interface LatLng {
    latitude: number
    longitude: number
  }
  interface Destination {
    destination: string
    destination_latlng: LatLng
    destination_hexid: string
  }
  interface RawRoute {
    route_number: string
    pickup_point: {
      pickup_point: string
      pickup_latlng: LatLng
      pickup_hexid: string
    }
    destinations: Destination[]
  }

  // ── Constants ──────────────────────────────────────────────────────────
  const DATA_URL =
    "https://raw.githubusercontent.com/sxcntqnt/sxcntqnt.github.io/refs/heads/main/json/YesBana.json"
  const PAGE_SIZE = 12

  // ── State ──────────────────────────────────────────────────────────────
  let routes: RawRoute[] = []
  let loading = true
  let error = ""
  let search = ""
  let expanded: string | null = null
  let page = 0

  // ── Helpers ────────────────────────────────────────────────────────────
  /** Camel-cased raw names → readable label */
  function readable(s: string): string {
    return s
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  /** Truncate long pickup descriptions */
  function clamp(s: string, max = 58): string {
    return s.length > max ? s.slice(0, max - 1) + "…" : s
  }

  /** Deterministic but varied fake vehicle count (seeded by route #) */
  function vehicleCount(num: string): number {
    const n = parseInt(num.replace(/\D/g, "") || "7", 10)
    return 3 + ((n * 17 + 11) % 19)
  }

  /** ETA from CBD heuristic */
  function etaMin(num: string): number {
    const n = parseInt(num.replace(/\D/g, "") || "7", 10)
    return 7 + ((n * 13 + 5) % 51)
  }

  /** Peak-hour awareness badge */
  function badge(route: RawRoute): {
    type: "live" | "busy" | "limited"
    label: string
  } {
    const h = new Date().getHours()
    const peak = (h >= 7 && h <= 9) || (h >= 17 && h <= 20)
    const dests = route.destinations.length
    if (peak && dests >= 3) return { type: "busy", label: "Peak Hours" }
    if (dests <= 1) return { type: "limited", label: "Limited" }
    return { type: "live", label: "Live" }
  }

  /** Short hex suffix for UI display */
  function hexSuffix(id: string): string {
    return id ? `⬡ ${id.slice(-6)}` : ""
  }

  // ── Data loading ───────────────────────────────────────────────────────
  onMount(async () => {
    try {
      const res = await fetch(DATA_URL)
      const json = await res.json()
      routes = (json.non_null_objects ?? []).filter(
        (r: RawRoute) =>
          r.route_number &&
          r.pickup_point?.pickup_point &&
          r.destinations?.length,
      )
    } catch (e) {
      error = "Could not load route data. Please check your connection."
    } finally {
      loading = false
    }
  })

  // ── Filtering + pagination ─────────────────────────────────────────────
  $: filtered = search.trim()
    ? routes.filter((r) => {
        const q = search.toLowerCase()
        return (
          r.route_number.toLowerCase().includes(q) ||
          r.pickup_point.pickup_point.toLowerCase().includes(q) ||
          r.destinations.some((d) => d.destination.toLowerCase().includes(q))
        )
      })
    : routes

  $: pages = Math.ceil(filtered.length / PAGE_SIZE)
  $: safeP = Math.min(page, Math.max(0, pages - 1))
  $: paginated = filtered.slice(
    safeP * PAGE_SIZE,
    safeP * PAGE_SIZE + PAGE_SIZE,
  )

  // Reset to page 0 on search change
  $: if (search) page = 0

  function toggle(num: string) {
    expanded = expanded === num ? null : num
  }
</script>

<!-- ── Markup ─────────────────────────────────────────────────────────── -->
<div class="rt">
  <!-- Toolbar -->
  <div class="toolbar">
    <label class="search-wrap">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" /><line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
        />
      </svg>
      <input
        class="search-input"
        bind:value={search}
        placeholder="Search routes, stages, destinations…"
        type="search"
        aria-label="Search routes"
      />
      {#if search}
        <button
          class="clear-btn"
          on:click={() => (search = "")}
          aria-label="Clear search">✕</button
        >
      {/if}
    </label>

    <div class="toolbar-right">
      {#if loading}
        <span class="chip chip-loading">Loading…</span>
      {:else}
        <span class="chip chip-count">{filtered.length} routes</span>
      {/if}
    </div>
  </div>

  <!-- Grid -->
  {#if loading}
    <!-- Skeleton cards -->
    <div class="grid">
      {#each { length: 6 } as _}
        <div class="card skeleton-card">
          <div class="sk sk-h"></div>
          <div class="sk sk-m"></div>
          <div class="sk sk-chips"></div>
          <div class="sk sk-stats"></div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="empty-state">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="12" r="10" /><line
          x1="12"
          y1="8"
          x2="12"
          y2="12"
        /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{error}</p>
    </div>
  {:else if paginated.length === 0}
    <div class="empty-state">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="11" cy="11" r="8" /><line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
        />
      </svg>
      <p>No routes match <strong>"{search}"</strong></p>
    </div>
  {:else}
    <div class="grid">
      {#each paginated as route (route.route_number)}
        {@const b = badge(route)}
        {@const vc = vehicleCount(route.route_number)}
        {@const eta = etaMin(route.route_number)}
        {@const isExpanded = expanded === route.route_number}

        <article
          class="card"
          class:card--expanded={isExpanded}
          class:card--busy={b.type === "busy"}
        >
          <!-- Card header -->
          <button
            class="card-header"
            on:click={() => toggle(route.route_number)}
            aria-expanded={isExpanded}
          >
            <div class="route-id">
              <span class="hex-glyph" aria-hidden="true">⬡</span>
              <span class="route-num">Route {route.route_number}</span>
            </div>
            <div class="header-right">
              <span class="badge badge--{b.type}">{b.label}</span>
              <svg
                class="chevron"
                class:open={isExpanded}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          <!-- Pickup stage -->
          <div class="pickup-row">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
              class="pick-ico"
            >
              <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8.5" />
            </svg>
            <span class="pickup-text"
              >{clamp(route.pickup_point.pickup_point)}</span
            >
          </div>

          <!-- Destination chips (top 3 + overflow) -->
          <div class="chips">
            {#each route.destinations.slice(0, 3) as d}
              <span class="chip-dest">{readable(d.destination)}</span>
            {/each}
            {#if route.destinations.length > 3}
              <span class="chip-more">+{route.destinations.length - 3}</span>
            {/if}
          </div>

          <!-- Stats bar -->
          <div class="stats-bar">
            <div class="stat">
              <div class="stat-val">{vc}</div>
              <div class="stat-lbl">Vehicles</div>
            </div>
            <div class="stat-sep"></div>
            <div class="stat">
              <div class="stat-val">{eta} min</div>
              <div class="stat-lbl">Next ETA</div>
            </div>
            <div class="stat-sep"></div>
            <div class="stat">
              <div class="stat-val">{route.destinations.length}</div>
              <div class="stat-lbl">Stops</div>
            </div>
          </div>

          <!-- Expanded destination list -->
          {#if isExpanded}
            <div class="expanded-panel">
              <div class="exp-title">All Stops</div>
              <ol class="exp-list">
                {#each route.destinations as d, i}
                  <li class="exp-row">
                    <span class="exp-num">{i + 1}</span>
                    <span class="exp-name">{readable(d.destination)}</span>
                    <span class="exp-hex">{hexSuffix(d.destination_hexid)}</span
                    >
                  </li>
                {/each}
              </ol>
              <div class="exp-footer">
                <span class="exp-pickup-hex"
                  >{hexSuffix(route.pickup_point.pickup_hexid)}</span
                >
                <span class="exp-note">H3 resolution 7 · ~1.2 km²/cell</span>
              </div>
            </div>
          {/if}
        </article>
      {/each}
    </div>

    <!-- Pagination -->
    {#if pages > 1}
      <div class="pagination">
        <button
          class="pg-btn"
          disabled={safeP === 0}
          on:click={() => (page = safeP - 1)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="pg-label">Page {safeP + 1} of {pages}</span>
        <button
          class="pg-btn"
          disabled={safeP === pages - 1}
          on:click={() => (page = safeP + 1)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- ── Styles ─────────────────────────────────────────────────────────── -->
<style>
  .rt {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .search-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 12px;
    cursor: text;
    transition: border-color 0.2s;
  }
  .search-wrap:focus-within {
    border-color: rgba(242, 101, 34, 0.45);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }
  .search-wrap svg {
    color: var(--text-3);
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--text-1);
    padding: 11px 0;
    appearance: none;
  }
  .search-input::placeholder {
    color: var(--text-3);
  }
  .search-input::-webkit-search-cancel-button {
    display: none;
  }
  .clear-btn {
    background: none;
    border: none;
    color: var(--text-3);
    font-size: 0.72rem;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
    transition: color 0.15s;
  }
  .clear-btn:hover {
    color: var(--text-2);
  }
  .toolbar-right {
    flex-shrink: 0;
  }
  .chip {
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.74rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .chip-count {
    background: var(--surface);
    border: 1px solid var(--rim);
    color: var(--text-2);
  }
  .chip-loading {
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.22);
    color: var(--orange);
  }

  /* Grid */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  /* Card */
  .card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
    transition:
      border-color 0.25s,
      transform 0.25s,
      box-shadow 0.25s;
  }
  .card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  }
  .card--expanded {
    border-color: rgba(242, 101, 34, 0.42);
    background: rgba(242, 101, 34, 0.025);
  }
  .card--busy {
    border-color: rgba(242, 101, 34, 0.22);
  }

  /* Card header */
  .card-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 18px 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    gap: 8px;
  }
  .route-id {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hex-glyph {
    color: rgba(242, 101, 34, 0.55);
    font-size: 1rem;
    line-height: 1;
  }
  .route-num {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.01em;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .badge {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .badge--live {
    background: rgba(0, 176, 155, 0.12);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.24);
  }
  .badge--busy {
    background: rgba(242, 101, 34, 0.12);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.24);
  }
  .badge--limited {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-3);
    border: 1px solid var(--rim);
  }
  .chevron {
    color: var(--text-3);
    transition: transform 0.25s ease;
  }
  .chevron.open {
    transform: rotate(180deg);
    color: var(--orange);
  }

  /* Pickup */
  .pickup-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 18px 0;
  }
  .pick-ico {
    color: var(--orange);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .pickup-text {
    font-size: 0.74rem;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* Destination chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 10px 18px 0;
  }
  .chip-dest {
    padding: 3px 9px;
    background: var(--ink);
    border: 1px solid var(--rim);
    border-radius: 100px;
    font-size: 0.66rem;
    color: var(--text-2);
    white-space: nowrap;
  }
  .chip-more {
    padding: 3px 9px;
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.18);
    border-radius: 100px;
    font-size: 0.66rem;
    font-weight: 700;
    color: var(--orange);
  }

  /* Stats bar */
  .stats-bar {
    display: flex;
    align-items: center;
    margin: 14px 18px 18px;
    background: var(--ink);
    border: 1px solid var(--rim);
    border-radius: 12px;
    padding: 10px 0;
  }
  .stat {
    flex: 1;
    text-align: center;
  }
  .stat-sep {
    width: 1px;
    height: 22px;
    background: var(--rim);
  }
  .stat-val {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.03em;
    line-height: 1;
    margin-bottom: 3px;
    font-variant-numeric: tabular-nums;
  }
  .stat-lbl {
    font-size: 0.6rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  /* Expanded panel */
  .expanded-panel {
    border-top: 1px solid var(--rim);
    padding: 14px 18px 16px;
    animation: slideIn 0.2s ease;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .exp-title {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--text-3);
    margin-bottom: 10px;
  }
  .exp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--rim) transparent;
  }
  .exp-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 10px;
    background: var(--ink);
    border-radius: 8px;
    font-size: 0.78rem;
  }
  .exp-num {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(242, 101, 34, 0.14);
    color: var(--orange);
    font-size: 0.62rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .exp-name {
    flex: 1;
    color: var(--text-2);
    font-weight: 500;
  }
  .exp-hex {
    font-family: monospace;
    font-size: 0.58rem;
    color: var(--text-3);
    opacity: 0.5;
  }
  .exp-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--rim);
  }
  .exp-pickup-hex {
    font-family: monospace;
    font-size: 0.62rem;
    color: var(--orange);
    opacity: 0.7;
  }
  .exp-note {
    font-size: 0.6rem;
    color: var(--text-3);
    opacity: 0.5;
  }

  /* Empty/error states */
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 52px 24px;
    text-align: center;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    color: var(--text-3);
    font-size: 0.875rem;
  }
  .empty-state strong {
    color: var(--text-2);
  }

  /* Skeleton */
  .skeleton-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    cursor: default;
  }
  .skeleton-card:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--rim);
  }
  .sk {
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--rim) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      var(--rim) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  .sk-h {
    height: 16px;
    width: 55%;
  }
  .sk-m {
    height: 10px;
    width: 85%;
  }
  .sk-chips {
    height: 22px;
  }
  .sk-stats {
    height: 44px;
    border-radius: 12px;
    margin-top: 4px;
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding-top: 4px;
  }
  .pg-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--rim);
    color: var(--text-2);
    cursor: pointer;
    transition:
      border-color 0.2s,
      color 0.2s;
  }
  .pg-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .pg-btn:not(:disabled):hover {
    border-color: rgba(242, 101, 34, 0.4);
    color: var(--orange);
  }
  .pg-label {
    font-size: 0.78rem;
    color: var(--text-3);
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
