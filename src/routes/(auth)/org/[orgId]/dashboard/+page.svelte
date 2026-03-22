<script lang="ts">
  /**
   * /org/[orgId]/dashboard/+page.svelte
   *
   * MERGED from:
   *   /org/[orgId]/+page.svelte        — server-loaded KPI overview
   *   /org/[orgId]/dashboard/+page.svelte — realtime fleet/contracts/analytics
   *
   * LAYOUT:
   *   1. KPI strip          — vehicles, revenue, compliance, members (server data)
   *   2. Revenue sparkline  — last 7 days (server data)
   *   3. Compliance alerts  — overdue items (server data)
   *   4. Fleet Map          — realtime Leaflet (canViewFleet)
   *   5. Contracts          — realtime assignment (canAssignContracts)
   *   6. Analytics          — realtime route stats (canViewAnalytics)
   *   7. Recent members     — server data
   *   8. Recent activity    — server data
   *
   * DATA FLOW:
   *   Server (load):  KPIs, sparkline, compliance, members, activity
   *   Client (stores): Fleet map, contracts, analytics — init on mount
   *   supabase client: passed from layout via data.supabase
   */

  import { onMount, onDestroy } from "svelte"
  import { sessionStore, canInOrg } from "$lib/features/auth/stores/auth"
  import { ACTIONS } from "$lib/features/auth/stores/permisions"
  import { initFleet, destroyFleet } from "$lib/features/fleet/stores/fleet"
  import {
    initContracts,
    destroyContracts,
  } from "$lib/features/contracts/contracts"
  import {
    initAnalytics,
    destroyAnalytics,
  } from "$lib/features/analytics/analytics"
  import FleetMap from "./fleet-map.svelte"
  import Contracts from "./contracts.svelte"
  import Analytics from "./analytics.svelte"

  // ── Props ─────────────────────────────────────────────────────
  type RevenueDay = { label: string; amount: number }

  let {
    data,
  }: {
    data: {
      orgId: string
      organization: { id: string; name: string; status: string } | null
      supabase: any
      // KPI data
      activeVehicleCount: number
      totalVehicleCount: number
      pendingMemberRequests: number
      revenueTodayTotal: number
      revenueByDay: RevenueDay[]
      complianceAlerts: {
        id: string
        title: string
        due_date: string
        status: string
      }[]
      recentActivity: {
        id: string
        event_type: string
        created_at: string
        severity: string
        performer: { full_name: string | null } | null
      }[]
      recentMembers: any[]
    }
  } = $props()

  // ── Auth ──────────────────────────────────────────────────────
  let profile = $derived($sessionStore.profile)

  // ── Realtime permission flags ─────────────────────────────────
  let canViewFleet = $derived(canInOrg(ACTIONS.VEHICLE_LIST, data.orgId))
  let canAssignContracts = $derived(canInOrg(ACTIONS.BOOKING_EDIT, data.orgId))
  let canViewAnalytics = $derived(canInOrg(ACTIONS.REPORTS_VIEW, data.orgId))

  // ── Realtime init state ───────────────────────────────────────
  let feedsLoading = $state(true)
  let feedsError = $state<string | null>(null)
  let initialized = false

  onMount(async () => {
    if (initialized) return
    initialized = true
    try {
      await Promise.all([
        initFleet(data.supabase, data.orgId),
        initContracts(data.supabase, data.orgId),
        initAnalytics(data.supabase, data.orgId),
      ])
    } catch (e) {
      feedsError = (e as Error).message
    } finally {
      feedsLoading = false
    }
  })

  onDestroy(() => {
    destroyFleet(data.supabase)
    destroyContracts(data.supabase)
    destroyAnalytics(data.supabase)
  })

  // ── Helpers ───────────────────────────────────────────────────
  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function formatKES(n: number): string {
    return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`
  }

  function initials(name: string | null): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const maxRevenue = Math.max(...data.revenueByDay.map((d) => d.amount), 1)
</script>

<div class="dash">
  <!-- ── Page header ─────────────────────────────────────────── -->
  <div class="dash-header">
    <div>
      <div class="eyebrow">SACCO Dashboard</div>
      <h1 class="dash-title">{data.organization?.name ?? "Overview"}</h1>
      {#if profile}
        <p class="dash-welcome">
          Welcome back, <strong>{profile.full_name ?? "Operator"}</strong>
        </p>
      {/if}
    </div>
    <a href={`/org/${data.orgId}/members`} class="dash-action-btn">
      {#if data.pendingMemberRequests > 0}
        <span class="dash-action-badge">{data.pendingMemberRequests}</span>
      {/if}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
      {data.pendingMemberRequests > 0
        ? `${data.pendingMemberRequests} pending`
        : "Invite members"}
    </a>
  </div>

  <!-- ── KPI strip (server data — instant render) ────────────── -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-icon kpi-fleet">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="2" /><path
            d="M16 8h4l3 3v5h-7V8z"
          />
          <circle cx="5.5" cy="18.5" r="2.5" /><circle
            cx="18.5"
            cy="18.5"
            r="2.5"
          />
        </svg>
      </div>
      <div class="kpi-body">
        <div class="kpi-label">Active Vehicles</div>
        <div class="kpi-value">
          {data.activeVehicleCount}<span class="kpi-sub"
            >/{data.totalVehicleCount}</span
          >
        </div>
        <div class="kpi-meta">fleet utilisation</div>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon kpi-revenue">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <div class="kpi-body">
        <div class="kpi-label">Revenue Today</div>
        <div class="kpi-value kpi-value-sm">
          {formatKES(data.revenueTodayTotal)}
        </div>
        <div class="kpi-meta">collected</div>
      </div>
    </div>

    <div
      class="kpi-card"
      class:kpi-card-alert={data.complianceAlerts.length > 0}
    >
      <div class="kpi-icon kpi-compliance">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div class="kpi-body">
        <div class="kpi-label">Compliance</div>
        <div
          class="kpi-value"
          style={data.complianceAlerts.length > 0 ? "color:#f87171" : ""}
        >
          {data.complianceAlerts.length}
        </div>
        <div class="kpi-meta">overdue items</div>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon kpi-members">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div class="kpi-body">
        <div class="kpi-label">Members</div>
        <div class="kpi-value">{data.recentMembers.length}</div>
        <div class="kpi-meta">
          {#if data.pendingMemberRequests > 0}
            <a href={`/org/${data.orgId}/members`} class="kpi-alert-link"
              >{data.pendingMemberRequests} pending</a
            >
          {:else}
            in organization
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- ── Revenue + Compliance row ────────────────────────────── -->
  <div class="mid-grid">
    <div class="card">
      <div class="card-hd">
        <span class="card-title">Revenue — Last 7 Days</span>
        <a href={`/org/${data.orgId}/finance`} class="card-link"
          >Full report →</a
        >
      </div>
      <div class="spark-chart">
        {#each data.revenueByDay as day}
          <div class="spark-col">
            <div
              class="spark-bar"
              style="height:{day.amount === 0
                ? 4
                : Math.max(8, (day.amount / maxRevenue) * 100)}px"
              title={formatKES(day.amount)}
            ></div>
            <span class="spark-label">{day.label}</span>
          </div>
        {/each}
      </div>
      {#if data.revenueByDay.every((d) => d.amount === 0)}
        <p class="card-empty">No revenue recorded in the last 7 days.</p>
      {/if}
    </div>

    <div class="card">
      <div class="card-hd">
        <span class="card-title">Compliance Alerts</span>
        <a href={`/org/${data.orgId}/compliance`} class="card-link"
          >View all →</a
        >
      </div>
      {#if data.complianceAlerts.length === 0}
        <div class="card-empty-state">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>All compliant</p>
        </div>
      {:else}
        <div class="alert-list">
          {#each data.complianceAlerts as alert}
            <div class="alert-row">
              <div class="alert-dot"></div>
              <div>
                <span class="alert-title">{alert.title}</span>
                <span class="alert-due"
                  >Due: {new Date(alert.due_date).toLocaleDateString(
                    "en-KE",
                  )}</span
                >
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- ── REALTIME SECTIONS (client-side stores) ───────────────── -->
  {#if feedsError}
    <div class="feeds-error">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Live feeds unavailable: {feedsError}
    </div>
  {/if}

  {#if feedsLoading}
    <div class="feeds-loading">
      <span class="feeds-spinner"></span>
      Connecting to live feeds…
    </div>
  {:else}
    <!-- Fleet Map -->
    {#if canViewFleet}
      <div class="section">
        <h2 class="section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <rect x="1" y="3" width="15" height="13" rx="2" /><path
              d="M16 8h4l3 3v5h-7V8z"
            />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle
              cx="18.5"
              cy="18.5"
              r="2.5"
            />
          </svg>
          Live Fleet
        </h2>
        <FleetMap />
      </div>
    {/if}

    <!-- Contracts -->
    {#if canAssignContracts}
      <div class="section">
        <h2 class="section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Contracts
        </h2>
        <Contracts supabase={data.supabase} />
      </div>
    {/if}

    <!-- Analytics -->
    {#if canViewAnalytics}
      <div class="section">
        <h2 class="section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Network Analytics
        </h2>
        <Analytics />
      </div>
    {/if}
  {/if}

  <!-- ── Bottom: members + activity (server data) ─────────────── -->
  <div class="bottom-grid">
    <div class="card">
      <div class="card-hd">
        <span class="card-title">Recent Members</span>
        <a href={`/org/${data.orgId}/members`} class="card-link"
          >All members →</a
        >
      </div>
      {#if data.recentMembers.length === 0}
        <p class="card-empty">No members yet.</p>
      {:else}
        <div class="member-list">
          {#each data.recentMembers as m}
            {@const prof = m.actors?.profiles}
            <div class="member-row">
              <div class="member-av">{initials(prof?.full_name ?? null)}</div>
              <div class="member-info">
                <span class="member-name">{prof?.full_name ?? "Unknown"}</span>
                <span class="member-role"
                  >{m.role?.replace(/_/g, " ") ?? ""}</span
                >
              </div>
              <span class="member-time">{timeAgo(m.created_at)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="card-hd">
        <span class="card-title">Recent Activity</span>
      </div>
      {#if data.recentActivity.length === 0}
        <p class="card-empty">No recent activity.</p>
      {:else}
        <div class="activity-list">
          {#each data.recentActivity as entry}
            <div class="activity-row">
              <div
                class="activity-dot"
                class:dot-critical={entry.severity === "critical"}
                class:dot-warn={entry.severity === "warn"}
              ></div>
              <div class="activity-info">
                <span class="activity-event">{entry.event_type}</span>
                <span class="activity-actor"
                  >{entry.performer?.full_name ?? "System"}</span
                >
              </div>
              <span class="activity-time">{timeAgo(entry.created_at)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
    margin: 0;
  }

  .dash {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #c084fc;
    margin-bottom: 0.3rem;
  }
  .dash-title {
    font-size: clamp(1.4rem, 2.5vw, 1.9rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f0f1f4;
    margin: 0;
  }
  .dash-welcome {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0.2rem 0 0;
  }
  .dash-welcome strong {
    color: rgba(255, 255, 255, 0.65);
  }
  .dash-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #c084fc;
    background: rgba(168, 85, 247, 0.08);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 10px;
    text-decoration: none;
    position: relative;
    transition: background 0.15s;
  }
  .dash-action-btn:hover {
    background: rgba(168, 85, 247, 0.14);
  }
  .dash-action-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f87171;
    font-size: 0.58rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* KPI grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.85rem;
  }
  .kpi-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 1.1rem 1.25rem;
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    transition:
      border-color 0.2s,
      transform 0.18s;
  }
  .kpi-card:hover {
    transform: translateY(-2px);
    border-color: rgba(168, 85, 247, 0.18);
  }
  .kpi-card-alert {
    border-color: rgba(248, 113, 113, 0.2) !important;
  }
  .kpi-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .kpi-fleet {
    background: rgba(96, 165, 250, 0.1);
    border: 1px solid rgba(96, 165, 250, 0.18);
    color: #60a5fa;
  }
  .kpi-revenue {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.18);
    color: #4ade80;
  }
  .kpi-compliance {
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.18);
    color: #c084fc;
  }
  .kpi-members {
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  .kpi-body {
    flex: 1;
    min-width: 0;
  }
  .kpi-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 0.3rem;
  }
  .kpi-value {
    font-size: 1.7rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #f0f1f4;
    line-height: 1;
  }
  .kpi-value-sm {
    font-size: 1.15rem;
  }
  .kpi-sub {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
  }
  .kpi-meta {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.25);
    margin-top: 0.25rem;
  }
  .kpi-alert-link {
    color: #f87171;
    text-decoration: none;
    font-weight: 600;
  }

  /* Mid grid */
  .mid-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.85rem;
  }

  /* Cards */
  .card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 1.1rem 1.25rem;
  }
  .card-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .card-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: #f0f1f4;
  }
  .card-link {
    font-size: 0.72rem;
    font-weight: 600;
    color: #c084fc;
    text-decoration: none;
    opacity: 0.8;
  }
  .card-link:hover {
    opacity: 1;
  }
  .card-empty {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    padding: 1.5rem 0;
    margin: 0;
  }
  .card-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem 0;
    color: rgba(255, 255, 255, 0.2);
    font-size: 0.82rem;
  }

  /* Sparkline */
  .spark-chart {
    display: flex;
    align-items: flex-end;
    gap: 0.4rem;
    height: 100px;
    padding-bottom: 0.5rem;
  }
  .spark-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    gap: 0.3rem;
  }
  .spark-bar {
    width: 100%;
    background: linear-gradient(
      to top,
      rgba(168, 85, 247, 0.55),
      rgba(168, 85, 247, 0.15)
    );
    border-radius: 4px 4px 0 0;
    min-height: 4px;
  }
  .spark-bar:hover {
    background: linear-gradient(
      to top,
      rgba(168, 85, 247, 0.8),
      rgba(168, 85, 247, 0.3)
    );
  }
  .spark-label {
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.25);
  }

  /* Compliance */
  .alert-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .alert-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: rgba(248, 113, 113, 0.06);
    border: 1px solid rgba(248, 113, 113, 0.12);
    border-radius: 8px;
  }
  .alert-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f87171;
    flex-shrink: 0;
    margin-top: 0.3rem;
  }
  .alert-title {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: #fca5a5;
  }
  .alert-due {
    display: block;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 0.1rem;
  }

  /* Feeds error / loading */
  .feeds-error {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 10px;
    font-size: 0.82rem;
    color: #f87171;
  }
  .feeds-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    padding: 2.5rem;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.85rem;
  }
  .feeds-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.07);
    border-top-color: #c084fc;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Realtime sections */
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: #d4d7e0;
    margin: 0;
  }
  .section-title svg {
    color: #c084fc;
  }

  /* Bottom grid */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }

  /* Members */
  .member-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .member-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .member-row:last-child {
    border-bottom: none;
  }
  .member-av {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(168, 85, 247, 0.12);
    border: 1px solid rgba(168, 85, 247, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: #c084fc;
    flex-shrink: 0;
  }
  .member-info {
    flex: 1;
    min-width: 0;
  }
  .member-name {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: #e2e4e9;
  }
  .member-role {
    display: block;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: capitalize;
  }
  .member-time {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.2);
    white-space: nowrap;
  }

  /* Activity */
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .activity-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .activity-row:last-child {
    border-bottom: none;
  }
  .activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }
  .dot-critical {
    background: #f87171;
  }
  .dot-warn {
    background: #facc15;
  }
  .activity-info {
    flex: 1;
    min-width: 0;
  }
  .activity-event {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: #d4d7e0;
    font-family: monospace;
  }
  .activity-actor {
    display: block;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 0.1rem;
  }
  .activity-time {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.2);
    white-space: nowrap;
  }

  /* Responsive */
  @media (max-width: 1100px) {
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 860px) {
    .mid-grid,
    .bottom-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    .kpi-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
