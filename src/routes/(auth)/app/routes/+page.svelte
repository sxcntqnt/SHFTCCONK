<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { browser } from "$app/environment"

  let { data } = $props()

  // Wire up sidebar section
  const adminSectionStore: Writable<string> = getContext("adminSection")
  $effect(() => {
    if (browser && adminSectionStore) adminSectionStore.set("routes")
  })

  // State
  let activeView: "tracked" | "frequent" | "discover" = $state("tracked")
  let showAiPanel = $state(true)
  let expandedRouteId: string | null = $state(null)
  let searchQuery = $state("")

  // Derived
  let hasTracked = $derived(
    data.stageRoutes.length > 0 || data.trackedRoutes.length > 0,
  )
  let hasFrequent = $derived(data.frequentRoutes.length > 0)
  let aiReady = $derived(data.aiRecommendations.ready)
  let pipelineStatus = $derived(data.aiRecommendations.pipelineStatus)

  // Untracked orgs for discovery
  let discoverOrgs = $derived(
    data.allOrgs.filter((o: any) => !data.trackedOrgIds.includes(o.id)),
  )

  // Search filter
  let filteredStageRoutes = $derived(
    searchQuery
      ? data.stageRoutes.filter(
          (r: any) =>
            r.stage_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            formatRoute(r.route)
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            r.organizations?.name
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()),
        )
      : data.stageRoutes,
  )

  function formatRoute(route: any): string {
    if (!route) return "Route details pending"
    if (typeof route === "string") return route
    if (route.from && route.to) return `${route.from} → ${route.to}`
    if (route.name) return route.name
    if (Array.isArray(route)) return route.join(" → ")
    return JSON.stringify(route)
  }

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })
  }

  function confidenceBar(confidence: number): string {
    return `${Math.round(confidence * 100)}%`
  }

  function suggestionIcon(type: string): string {
    const icons: Record<string, string> = {
      route_optimization: "⚡",
      fare_prediction: "💰",
      congestion_alert: "🔴",
      new_route: "✨",
      safety_alert: "🛡️",
    }
    return icons[type] || "💡"
  }

  function pipelineColor(status: string): string {
    switch (status) {
      case "ready":
      case "stored":
      case "enhanced":
        return "ps-live"
      case "training":
        return "ps-training"
      default:
        return "ps-idle"
    }
  }
</script>

<svelte:head>
  <title>Routes — Matatu Pulse</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="rt-page">
  <!-- ═══ Header ═══ -->
  <header class="rt-header">
    <div class="rt-header-text">
      <div class="rt-eyebrow">
        <span class="rt-pulse"></span>
        Routes Intelligence
      </div>
      <h1 class="rt-title">Your <em>Network</em></h1>
      <p class="rt-desc">
        Tracked routes, travel patterns, and AI-powered insights — your personal
        transit brain.
      </p>
    </div>

    <!-- Stats strip -->
    <div class="rt-stats">
      <div class="rt-stat">
        <span class="rt-stat-val">{data.stageRoutes.length}</span>
        <span class="rt-stat-lbl">Routes Tracked</span>
      </div>
      <div class="rt-stat-sep"></div>
      <div class="rt-stat">
        <span class="rt-stat-val">{data.frequentRoutes.length}</span>
        <span class="rt-stat-lbl">Frequent</span>
      </div>
      <div class="rt-stat-sep"></div>
      <div class="rt-stat">
        <span class="rt-stat-val">{data.recentBookings.length}</span>
        <span class="rt-stat-lbl">Recent Trips</span>
      </div>
      <div class="rt-stat-sep"></div>
      <div class="rt-stat">
        <span class="rt-stat-val">{data.trackedOrgIds.length}</span>
        <span class="rt-stat-lbl">SACCOs</span>
      </div>
    </div>
  </header>

  <!-- ═══ AI Intelligence Panel ═══ -->
  {#if showAiPanel}
    <section class="ai-panel" style="animation-delay: 80ms">
      <div class="ai-panel-header">
        <div class="ai-badge">
          <span class="ai-badge-glow"></span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg
          >
          <span>Ma3 Intelligence</span>
        </div>
        <div class="ai-status-row">
          <!-- Pipeline status dots -->
          <div class="ps-group" title="RegionDCL model">
            <span class="ps-dot {pipelineColor(pipelineStatus.regiondcl)}"
            ></span>
            <span class="ps-label">DCL</span>
          </div>
          <div class="ps-group" title="RL policy">
            <span class="ps-dot {pipelineColor(pipelineStatus.rl_policy)}"
            ></span>
            <span class="ps-label">RL</span>
          </div>
          <div class="ps-group" title="Embeddings">
            <span class="ps-dot {pipelineColor(pipelineStatus.embeddings)}"
            ></span>
            <span class="ps-label">EMB</span>
          </div>
          <div class="ps-group" title="Features">
            <span class="ps-dot {pipelineColor(pipelineStatus.features)}"
            ></span>
            <span class="ps-label">FT</span>
          </div>
        </div>
        <button class="ai-dismiss" onclick={() => (showAiPanel = false)}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><line x1="18" y1="6" x2="6" y2="18" /><line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            /></svg
          >
        </button>
      </div>

      {#if aiReady && data.aiRecommendations.suggestions.length > 0}
        <!-- Live recommendations -->
        <div class="ai-suggestions">
          {#each data.aiRecommendations.suggestions as suggestion, i}
            <div class="ai-card" style="animation-delay: {120 + i * 60}ms">
              <div class="ai-card-icon">{suggestionIcon(suggestion.type)}</div>
              <div class="ai-card-content">
                <div class="ai-card-top">
                  <span class="ai-card-type"
                    >{suggestion.type.replace(/_/g, " ")}</span
                  >
                  <span class="ai-card-confidence"
                    >{confidenceBar(suggestion.confidence)}</span
                  >
                </div>
                <h3 class="ai-card-title">{suggestion.title}</h3>
                <p class="ai-card-body">{suggestion.body}</p>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Pipeline warming / not ready -->
        <div class="ai-warming">
          <div class="ai-warming-vis">
            <div class="ai-orb ai-orb-1"></div>
            <div class="ai-orb ai-orb-2"></div>
            <div class="ai-orb ai-orb-3"></div>
            <div class="ai-grid-bg"></div>
          </div>
          <div class="ai-warming-text">
            <h3>Learning your city</h3>
            <p>
              The Ma3 recommendation engine is processing Nairobi's transit
              graph — region embeddings, route optimization, and demand
              prediction. Recommendations will surface here as the pipeline
              warms up.
            </p>
            <div class="ai-pipeline-steps">
              <div class="ai-step">
                <span class="ai-step-num">1</span>
                <span>Spatial joins & H3 geometry</span>
              </div>
              <div class="ai-step-line"></div>
              <div class="ai-step">
                <span class="ai-step-num">2</span>
                <span>RegionDCL contrastive learning</span>
              </div>
              <div class="ai-step-line"></div>
              <div class="ai-step">
                <span class="ai-step-num">3</span>
                <span>Hierarchical RL policy</span>
              </div>
              <div class="ai-step-line"></div>
              <div class="ai-step">
                <span class="ai-step-num">4</span>
                <span>Route recommendations</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>
  {:else}
    <button class="ai-reopen" onclick={() => (showAiPanel = true)}>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        ><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg
      >
      Show AI Intelligence
    </button>
  {/if}

  <!-- ═══ View Tabs ═══ -->
  <div class="rt-tabs">
    <button
      class="rt-tab"
      class:rt-tab-on={activeView === "tracked"}
      onclick={() => (activeView = "tracked")}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
          cx="12"
          cy="10"
          r="3"
        /></svg
      >
      Tracked
      {#if hasTracked}<span class="rt-tab-count">{data.stageRoutes.length}</span
        >{/if}
    </button>
    <button
      class="rt-tab"
      class:rt-tab-on={activeView === "frequent"}
      onclick={() => (activeView = "frequent")}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg
      >
      Frequent
      {#if hasFrequent}<span class="rt-tab-count"
          >{data.frequentRoutes.length}</span
        >{/if}
    </button>
    <button
      class="rt-tab"
      class:rt-tab-on={activeView === "discover"}
      onclick={() => (activeView = "discover")}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><circle cx="11" cy="11" r="8" /><line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
        /></svg
      >
      Discover
      {#if discoverOrgs.length > 0}<span class="rt-tab-count"
          >{discoverOrgs.length}</span
        >{/if}
    </button>
  </div>

  <!-- ═══ TRACKED VIEW ═══ -->
  {#if activeView === "tracked"}
    <!-- Search -->
    <div class="rt-search">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><circle cx="11" cy="11" r="8" /><line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
        /></svg
      >
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search routes, stages, SACCOs…"
        class="rt-search-input"
      />
      {#if searchQuery}
        <button class="rt-search-clear" onclick={() => (searchQuery = "")}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><line x1="18" y1="6" x2="6" y2="18" /><line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            /></svg
          >
        </button>
      {/if}
    </div>

    {#if filteredStageRoutes.length === 0 && !hasTracked}
      <div class="rt-empty">
        <div class="rt-empty-icon">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle
              cx="12"
              cy="10"
              r="3"
            /></svg
          >
        </div>
        <h2>No routes tracked yet</h2>
        <p>
          Subscribe to a SACCO's routes to start building your network. Head to <strong
            >Discover</strong
          > to find SACCOs operating near you.
        </p>
        <button class="rt-empty-btn" onclick={() => (activeView = "discover")}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            ><circle cx="11" cy="11" r="8" /><line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            /></svg
          >
          Discover SACCOs
        </button>
      </div>
    {:else}
      <div class="rt-route-list">
        {#each filteredStageRoutes as route, i}
          {@const isExpanded = expandedRouteId === route.id}
          <div
            class="rt-route"
            class:rt-route-expanded={isExpanded}
            style="animation-delay: {i * 35}ms"
          >
            <button
              class="rt-route-btn"
              onclick={() => (expandedRouteId = isExpanded ? null : route.id)}
            >
              <div class="rt-route-marker">
                <span class="rt-marker-dot"></span>
                <span class="rt-marker-line"></span>
                <span class="rt-marker-dot rt-marker-end"></span>
              </div>
              <div class="rt-route-info">
                <h3 class="rt-route-name">{route.stage_name}</h3>
                <p class="rt-route-detail">{formatRoute(route.route)}</p>
                {#if route.organizations?.name}
                  <span class="rt-route-org">{route.organizations.name}</span>
                {/if}
              </div>
              <div class="rt-route-right">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="rt-chevron"
                  class:rt-chevron-open={isExpanded}
                  ><polyline points="6 9 12 15 18 9" /></svg
                >
              </div>
            </button>

            {#if isExpanded}
              <div class="rt-route-expanded-content rt-slide-in">
                <div class="rt-expanded-grid">
                  <div class="rt-exp-item">
                    <span class="rt-exp-label">Stage</span>
                    <span class="rt-exp-value">{route.stage_name}</span>
                  </div>
                  <div class="rt-exp-item">
                    <span class="rt-exp-label">SACCO</span>
                    <span class="rt-exp-value"
                      >{route.organizations?.name || "—"}</span
                    >
                  </div>
                  <div class="rt-exp-item">
                    <span class="rt-exp-label">Route</span>
                    <span class="rt-exp-value">{formatRoute(route.route)}</span>
                  </div>
                  <div class="rt-exp-item">
                    <span class="rt-exp-label">Added</span>
                    <span class="rt-exp-value">{timeAgo(route.created_at)}</span
                    >
                  </div>
                </div>
                <div class="rt-exp-actions">
                  <a href="/app/map" class="rt-exp-btn">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                      /></svg
                    >
                    View on Map
                  </a>
                  {#if route.organization_id}
                    <a
                      href="/app/subscribe/{route.organization_id}/news"
                      class="rt-exp-btn"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><path
                          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                        /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg
                      >
                      News Feed
                    </a>
                  {/if}
                </div>
                <code class="rt-route-id">{route.id}</code>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- ═══ FREQUENT VIEW ═══ -->
  {#if activeView === "frequent"}
    {#if data.frequentRoutes.length === 0}
      <div class="rt-empty">
        <div class="rt-empty-icon">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg
          >
        </div>
        <h2>No travel patterns yet</h2>
        <p>
          Once you start booking trips, the system learns your corridors. Your
          most-traveled routes will appear here with fare history and smart
          predictions.
        </p>
      </div>
    {:else}
      <div class="rt-freq-list">
        {#each data.frequentRoutes as route, i}
          <div class="rt-freq-card" style="animation-delay: {i * 45}ms">
            <div class="rt-freq-rank">
              <span class="rt-rank-num">{i + 1}</span>
            </div>
            <div class="rt-freq-route">
              <div class="rt-freq-path">
                <span class="rt-freq-from">{route.from}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="rt-freq-arrow"><path d="M5 12h14M12 5l7 7-7 7" /></svg
                >
                <span class="rt-freq-to">{route.to}</span>
              </div>
              {#if route.orgName}
                <span class="rt-freq-org">{route.orgName}</span>
              {/if}
            </div>
            <div class="rt-freq-meta">
              <div class="rt-freq-stat">
                <span class="rt-freq-stat-val">{route.count}</span>
                <span class="rt-freq-stat-lbl">trips</span>
              </div>
              {#if route.lastFare}
                <div class="rt-freq-stat">
                  <span class="rt-freq-stat-val">KES {route.lastFare}</span>
                  <span class="rt-freq-stat-lbl">last fare</span>
                </div>
              {/if}
              <div class="rt-freq-stat">
                <span class="rt-freq-stat-val">{timeAgo(route.lastTrip)}</span>
                <span class="rt-freq-stat-lbl">last trip</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- ═══ DISCOVER VIEW ═══ -->
  {#if activeView === "discover"}
    {#if discoverOrgs.length === 0}
      <div class="rt-empty">
        <div class="rt-empty-icon">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            ><circle cx="11" cy="11" r="8" /><line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            /></svg
          >
        </div>
        <h2>You're tracking everything</h2>
        <p>
          You've subscribed to all available SACCOs. New organizations will
          appear here as they register on the platform.
        </p>
      </div>
    {:else}
      <p class="rt-discover-intro">
        SACCOs you haven't subscribed to yet. Subscribe to receive route
        updates, fare changes, and service alerts.
      </p>
      <div class="rt-discover-grid">
        {#each discoverOrgs as org, i}
          <a
            href="/app/subscribe/{org.id}"
            class="rt-discover-card"
            style="animation-delay: {i * 40}ms"
          >
            <div class="rt-discover-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path
                  d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                /><polyline points="9 22 9 12 15 12 15 22" /></svg
              >
            </div>
            <div class="rt-discover-info">
              <span class="rt-discover-name">{org.name}</span>
              <span class="rt-discover-cta">Subscribe to routes →</span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- ═══ Recent Trips Ticker ═══ -->
  {#if data.recentBookings.length > 0}
    <div class="rt-divider"></div>
    <div class="rt-recent-section">
      <div class="rt-section-head">
        <h2 class="rt-section-title">Recent Trips</h2>
        <span class="rt-section-count">{data.recentBookings.length} trips</span>
      </div>
      <div class="rt-ticker">
        {#each data.recentBookings as booking, i}
          <div class="rt-trip" style="animation-delay: {i * 30}ms">
            <div class="rt-trip-route">
              {#if booking.route_from && booking.route_to}
                <span>{booking.route_from}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
                >
                <span>{booking.route_to}</span>
              {:else}
                <span class="rt-trip-pending">Route data pending</span>
              {/if}
            </div>
            <div class="rt-trip-meta">
              {#if booking.fare}
                <span class="rt-trip-fare">KES {booking.fare}</span>
              {/if}
              {#if booking.vehicles?.reg_number}
                <code class="rt-trip-reg">{booking.vehicles.reg_number}</code>
              {/if}
              <span class="rt-trip-time">{timeAgo(booking.created_at)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Foundation ── */
  .rt-page {
    min-height: 100%;
  }

  /* ── Header ── */
  .rt-header {
    margin-bottom: 24px;
    animation: rt-in 0.5s ease-out both;
  }
  @keyframes rt-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .rt-eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .rt-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    animation: rt-pulse 2s ease-out infinite;
  }
  @keyframes rt-pulse {
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

  .rt-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin: 0 0 6px;
  }
  .rt-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .rt-desc {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
    margin: 0 0 16px;
  }

  .rt-stats {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 12px;
  }
  .rt-stat {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rt-stat-val {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-1);
    font-family: var(--font-display);
    letter-spacing: -0.03em;
  }
  .rt-stat-lbl {
    font-size: 0.7rem;
    color: var(--text-3);
  }
  .rt-stat-sep {
    width: 1px;
    height: 18px;
    background: var(--rim);
  }

  /* ═══ AI Panel ═══ */
  .ai-panel {
    margin-bottom: 20px;
    padding: 20px;
    background: rgba(242, 101, 34, 0.03);
    border: 1px solid rgba(242, 101, 34, 0.1);
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    animation: rt-in 0.5s ease-out both;
  }
  .ai-panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.15);
    padding: 5px 12px;
    border-radius: 100px;
    position: relative;
    overflow: hidden;
  }
  .ai-badge-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.06),
      transparent
    );
    animation: ai-shimmer 3s ease-in-out infinite;
  }
  @keyframes ai-shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .ai-status-row {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  .ps-group {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .ps-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .ps-live {
    background: #34d399;
    box-shadow: 0 0 4px rgba(52, 211, 153, 0.4);
  }
  .ps-training {
    background: #fbbf24;
    animation: ps-blink 1.5s ease-in-out infinite;
  }
  @keyframes ps-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
  .ps-idle {
    background: var(--text-3);
    opacity: 0.3;
  }
  .ps-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.58rem;
    color: var(--text-3);
    font-weight: 500;
  }

  .ai-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    opacity: 0.4;
    padding: 4px;
    transition: opacity 0.15s;
  }
  .ai-dismiss:hover {
    opacity: 1;
  }

  .ai-reopen {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.06);
    border: 1px solid rgba(242, 101, 34, 0.1);
    border-radius: 10px;
    padding: 8px 14px;
    cursor: pointer;
    margin-bottom: 16px;
    font-family: var(--font-body);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .ai-reopen:hover {
    background: rgba(242, 101, 34, 0.1);
    border-color: rgba(242, 101, 34, 0.2);
  }

  /* AI suggestions */
  .ai-suggestions {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .ai-suggestions::-webkit-scrollbar {
    display: none;
  }
  .ai-card {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    min-width: 260px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 12px;
    animation: rt-in 0.4s ease-out both;
    transition: border-color 0.15s;
  }
  .ai-card:hover {
    border-color: rgba(242, 101, 34, 0.2);
  }
  .ai-card-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
    padding-top: 2px;
  }
  .ai-card-content {
    flex: 1;
    min-width: 0;
  }
  .ai-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .ai-card-type {
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--orange);
  }
  .ai-card-confidence {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.62rem;
    color: var(--teal);
  }
  .ai-card-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
    margin: 0 0 3px;
  }
  .ai-card-body {
    font-size: 0.72rem;
    color: var(--text-3);
    line-height: 1.5;
    margin: 0;
  }

  /* AI warming state */
  .ai-warming {
    display: flex;
    gap: 24px;
    align-items: center;
  }
  .ai-warming-vis {
    width: 120px;
    height: 100px;
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 12px;
  }
  .ai-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(20px);
  }
  .ai-orb-1 {
    width: 60px;
    height: 60px;
    top: 10%;
    left: 10%;
    background: rgba(242, 101, 34, 0.15);
    animation: orb-d 8s ease-in-out infinite alternate;
  }
  .ai-orb-2 {
    width: 45px;
    height: 45px;
    bottom: 5%;
    right: 10%;
    background: rgba(0, 176, 155, 0.12);
    animation: orb-d 11s ease-in-out infinite alternate-reverse;
  }
  .ai-orb-3 {
    width: 35px;
    height: 35px;
    top: 40%;
    left: 50%;
    background: rgba(96, 165, 250, 0.08);
    animation: orb-d 14s ease-in-out infinite alternate;
  }
  @keyframes orb-d {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(10px, -8px);
    }
  }
  .ai-grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 12px 12px;
  }
  .ai-warming-text {
    flex: 1;
    min-width: 0;
  }
  .ai-warming-text h3 {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 1.1rem;
    color: var(--text-1);
    margin: 0 0 6px;
    font-weight: 400;
  }
  .ai-warming-text p {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .ai-pipeline-steps {
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
  }
  .ai-step {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    color: var(--text-3);
  }
  .ai-step-num {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58rem;
    font-weight: 700;
    background: rgba(242, 101, 34, 0.08);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.15);
  }
  .ai-step-line {
    width: 12px;
    height: 1px;
    background: var(--rim);
    margin: 0 4px;
  }

  /* ═══ Tabs ═══ */
  .rt-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 14px;
    animation: rt-in 0.5s ease-out both;
    animation-delay: 120ms;
  }
  .rt-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: 0.8rem;
    font-weight: 500;
    font-family: var(--font-body);
    color: var(--text-3);
    background: none;
    border: none;
    border-radius: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .rt-tab:hover {
    color: var(--text-2);
  }
  .rt-tab-on {
    color: var(--text-1);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
  .rt-tab-count {
    font-size: 0.62rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 100px;
    background: rgba(242, 101, 34, 0.1);
    color: var(--orange);
  }

  /* ═══ Search ═══ */
  .rt-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 12px;
    margin-bottom: 16px;
    color: var(--text-3);
    transition: border-color 0.15s;
  }
  .rt-search:focus-within {
    border-color: rgba(242, 101, 34, 0.25);
  }
  .rt-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.85rem;
    color: var(--text-2);
    font-family: var(--font-body);
  }
  .rt-search-input::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }
  .rt-search-clear {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    padding: 2px;
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  .rt-search-clear:hover {
    opacity: 1;
  }

  /* ═══ Empty state ═══ */
  .rt-empty {
    text-align: center;
    padding: 48px 24px;
    animation: rt-in 0.5s ease-out both;
  }
  .rt-empty-icon {
    color: var(--text-3);
    opacity: 0.4;
    margin-bottom: 16px;
  }
  .rt-empty h2 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin: 0 0 6px;
  }
  .rt-empty p {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.6;
    margin: 0 0 16px;
    max-width: 360px;
    display: inline-block;
  }
  .rt-empty p strong {
    color: var(--orange);
    font-weight: 600;
  }
  .rt-empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: var(--font-body);
    padding: 10px 20px;
    border-radius: 12px;
    cursor: pointer;
    color: var(--text-1);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    transition: all 0.15s;
  }
  .rt-empty-btn:hover {
    background: rgba(242, 101, 34, 0.15);
    transform: translateY(-1px);
  }

  /* ═══ Route list (tracked) ═══ */
  .rt-route-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rt-route {
    border: 1px solid var(--rim);
    border-radius: 14px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.015);
    animation: rt-in 0.35s ease-out both;
    transition: border-color 0.2s;
  }
  .rt-route:hover {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .rt-route-expanded {
    border-color: rgba(242, 101, 34, 0.15);
  }

  .rt-route-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    color: inherit;
  }
  .rt-route-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    width: 10px;
  }
  .rt-marker-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--orange);
  }
  .rt-marker-end {
    background: var(--teal);
  }
  .rt-marker-line {
    width: 2px;
    height: 14px;
    background: var(--rim);
    border-radius: 1px;
  }

  .rt-route-info {
    flex: 1;
    min-width: 0;
  }
  .rt-route-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
    margin: 0 0 2px;
  }
  .rt-route-detail {
    font-size: 0.78rem;
    color: var(--text-3);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rt-route-org {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
    margin-top: 3px;
  }
  .rt-chevron {
    color: var(--text-3);
    opacity: 0.4;
    transition:
      transform 0.2s ease,
      opacity 0.15s;
    flex-shrink: 0;
  }
  .rt-chevron-open {
    transform: rotate(180deg);
    opacity: 0.8;
  }

  .rt-route-expanded-content {
    padding: 0 16px 16px;
  }
  .rt-expanded-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
    border: 1px solid var(--rim);
    margin-bottom: 10px;
  }
  .rt-exp-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .rt-exp-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    font-weight: 600;
  }
  .rt-exp-value {
    font-size: 0.78rem;
    color: var(--text-2);
  }
  .rt-exp-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }
  .rt-exp-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--rim);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .rt-exp-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .rt-route-id {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.6rem;
    color: var(--text-3);
    opacity: 0.4;
  }

  /* ═══ Frequent routes ═══ */
  .rt-freq-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rt-freq-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border: 1px solid var(--rim);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.015);
    animation: rt-in 0.35s ease-out both;
    transition: border-color 0.2s;
  }
  .rt-freq-card:hover {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .rt-freq-rank {
    flex-shrink: 0;
  }
  .rt-rank-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 800;
    font-family: var(--font-display);
    letter-spacing: -0.03em;
    background: rgba(242, 101, 34, 0.08);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.12);
  }
  .rt-freq-route {
    flex: 1;
    min-width: 0;
  }
  .rt-freq-path {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  .rt-freq-from,
  .rt-freq-to {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .rt-freq-arrow {
    color: var(--orange);
    opacity: 0.6;
    flex-shrink: 0;
  }
  .rt-freq-org {
    font-size: 0.68rem;
    color: var(--text-3);
  }

  .rt-freq-meta {
    display: flex;
    gap: 14px;
    flex-shrink: 0;
  }
  .rt-freq-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
  }
  .rt-freq-stat-val {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .rt-freq-stat-lbl {
    font-size: 0.58rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ═══ Discover ═══ */
  .rt-discover-intro {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.6;
    margin: 0 0 16px;
  }
  .rt-discover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
  }
  .rt-discover-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--rim);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.015);
    text-decoration: none;
    animation: rt-in 0.35s ease-out both;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .rt-discover-card:hover {
    border-color: rgba(242, 101, 34, 0.2);
    background: rgba(242, 101, 34, 0.03);
  }
  .rt-discover-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--rim);
    color: var(--text-3);
    flex-shrink: 0;
  }
  .rt-discover-card:hover .rt-discover-icon {
    color: var(--orange);
    border-color: rgba(242, 101, 34, 0.15);
  }
  .rt-discover-name {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .rt-discover-cta {
    display: block;
    font-size: 0.68rem;
    color: var(--orange);
    margin-top: 2px;
  }

  /* ═══ Recent trips ═══ */
  .rt-divider {
    height: 1px;
    background: var(--rim);
    margin: 28px 0;
  }
  .rt-recent-section {
    animation: rt-in 0.5s ease-out both;
    animation-delay: 200ms;
  }
  .rt-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .rt-section-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin: 0;
  }
  .rt-section-count {
    font-size: 0.68rem;
    color: var(--text-3);
  }

  .rt-ticker {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rt-trip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid transparent;
    animation: rt-in 0.3s ease-out both;
    transition: border-color 0.15s;
  }
  .rt-trip:hover {
    border-color: var(--rim);
  }
  .rt-trip-route {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .rt-trip-pending {
    color: var(--text-3);
    font-weight: 400;
    font-style: italic;
  }
  .rt-trip-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rt-trip-fare {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--teal);
  }
  .rt-trip-reg {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.65rem;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.03);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .rt-trip-time {
    font-size: 0.68rem;
    color: var(--text-3);
  }

  /* ═══ Utils ═══ */
  .rt-slide-in {
    animation: rt-slide 0.25s ease-out;
  }
  @keyframes rt-slide {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 700px) {
    .rt-stats {
      gap: 10px;
    }
    .ai-warming {
      flex-direction: column;
    }
    .ai-warming-vis {
      width: 100%;
      height: 60px;
    }
    .rt-expanded-grid {
      grid-template-columns: 1fr;
    }
    .rt-freq-card {
      flex-wrap: wrap;
    }
    .rt-freq-meta {
      width: 100%;
      justify-content: flex-start;
    }
    .rt-discover-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
