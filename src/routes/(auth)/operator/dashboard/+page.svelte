<!-- src/routes/(auth)/operator/+page.svelte -->
<!--
  CONTEXT:
    operatorCtx activated by /operator/+layout.ts via requireOperatorAccess.
    This page reads from the store — no activation here.

  DATA FLOW:
    Real KPIs come from +page.server.ts (trip counts, revenue).
    Notifications and fuel come from their respective stores.
    All mock data has been stripped — see +page.server.ts for server load.
-->
<script lang="ts">
  import { page } from "$app/state"
  import {
    operatorCtx,
    operatorOrgSlots,
    operatorOrgCount,
    activeOrgName,
    inProgressTrips,
    pendingDispatches,
    opsSummary,
    operatorActiveOrgId,
  } from "$lib/features/auth/contexts"
  import { sessionStore } from "$lib/features/auth/stores/auth"

  interface Props {
    data: {
      todayRevenueKes: number
      activeVehicles: number
      totalTripsToday: number
      pendingDispatches: number
      recentTrips: {
        id: string
        route: string
        driver: string
        conductor?: string
        status: "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "SCHEDULED"
        revenueKes: number
        vehiclePlate: string
        departedAt: string | null
      }[]
      openIncidents: {
        id: string
        vehiclePlate: string
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        type: string
        description: string
        createdAt: string
      }[]
      fuelAlerts: {
        vehicleId: string
        plate: string
        fuelPct: number
        lastFillDaysAgo: number
      }[]
    }
  }

  let { data }: Props = $props()

  const operator = $derived($operatorCtx)
  const profile = $derived($sessionStore.profile)
  const orgSlots = $derived($operatorOrgSlots)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function initials(name?: string | null): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  function fmtKes(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return "—"
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return "Just now"
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
  }

  function fuelColor(pct: number): string {
    return pct > 50 ? "#00b09b" : pct > 25 ? "#facc15" : "#f87171"
  }

  const STATUS_CONFIG = {
    IN_PROGRESS: {
      label: "Live",
      color: "#00b09b",
      bg: "rgba(0,176,155,.1)",
      pulse: true,
    },
    COMPLETED: {
      label: "Done",
      color: "#6b7280",
      bg: "rgba(107,114,128,.07)",
      pulse: false,
    },
    DELAYED: {
      label: "Delayed",
      color: "#facc15",
      bg: "rgba(250,204,21,.09)",
      pulse: false,
    },
    SCHEDULED: {
      label: "Scheduled",
      color: "#818cf8",
      bg: "rgba(129,140,248,.09)",
      pulse: false,
    },
  }

  const SEV_CONFIG = {
    CRITICAL: { color: "#f87171", label: "Critical" },
    HIGH: { color: "#fb923c", label: "High" },
    MEDIUM: { color: "#facc15", label: "Medium" },
    LOW: { color: "#9ca3af", label: "Low" },
  }

  // Today's date string
  const todayStr = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
</script>

<svelte:head><title>Fleet Command — Matatu Pulse</title></svelte:head>

<div class="page">
  <!-- ── Page header ───────────────────────────────────────────────────────── -->
  <div class="page-hd">
    <div class="hd-left">
      <div class="eyebrow">
        <span class="live-ring"></span>
        OPERATOR · LIVE OPERATIONS
      </div>
      <h1 class="page-title">Fleet <em>Command</em></h1>
      <p class="page-sub">{todayStr}</p>
    </div>

    <div class="hd-right">
      <!-- Org switcher if multi-org -->
      {#if orgSlots.length > 1}
        <div class="org-switcher">
          {#each orgSlots.slice(0, 3) as slot}
            <div
              class="org-chip {$operatorActiveOrgId === slot.orgId
                ? 'active'
                : ''}"
              title={slot.orgName}
            >
              {slot.orgName.slice(0, 2).toUpperCase()}
            </div>
          {/each}
          {#if orgSlots.length > 3}
            <div class="org-chip more">+{orgSlots.length - 3}</div>
          {/if}
        </div>
      {/if}

      <div class="hd-actions">
        <a href="/operator/trips" class="act-btn trips">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          >
          All Trips
        </a>
        <a href="/operator/wallet" class="act-btn wallet">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><rect x="2" y="5" width="20" height="14" rx="2" /><line
              x1="2"
              y1="10"
              x2="22"
              y2="10"
            /></svg
          >
          Wallet
        </a>
      </div>
    </div>
  </div>

  <!-- ── KPI strip ──────────────────────────────────────────────────────────── -->
  <div class="kpi-strip">
    <div class="kpi kpi-revenue">
      <div class="kpi-inner">
        <div class="kpi-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="1" x2="12" y2="23" /><path
              d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
            />
          </svg>
        </div>
        <div class="kpi-lbl">Revenue Today</div>
        <div class="kpi-val">KES {fmtKes(data.todayRevenueKes)}</div>
        <div class="kpi-meta">
          across {orgSlots.length} org{orgSlots.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div class="kpi-shimmer"></div>
    </div>

    <div class="kpi kpi-vehicles">
      <div class="kpi-inner">
        <div class="kpi-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="1" y="3" width="15" height="13" rx="2" /><path
              d="M16 8h4l3 3v5h-7z"
            />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle
              cx="18.5"
              cy="18.5"
              r="2.5"
            />
          </svg>
        </div>
        <div class="kpi-lbl">Active Vehicles</div>
        <div class="kpi-val teal">{data.activeVehicles}</div>
        <div class="kpi-meta">dispatched now</div>
      </div>
    </div>

    <div class="kpi kpi-trips">
      <div class="kpi-inner">
        <div class="kpi-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div class="kpi-lbl">Trips Today</div>
        <div class="kpi-val">{data.totalTripsToday}</div>
        <div class="kpi-meta">completed + live</div>
      </div>
    </div>

    <div class="kpi kpi-dispatch {data.pendingDispatches > 0 ? 'urgent' : ''}">
      <div class="kpi-inner">
        <div class="kpi-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" /><polyline
              points="12 6 12 12 16 14"
            />
          </svg>
        </div>
        <div class="kpi-lbl">Pending Dispatch</div>
        <div class="kpi-val {data.pendingDispatches > 0 ? 'amber' : ''}">
          {data.pendingDispatches}
        </div>
        <div class="kpi-meta">awaiting driver ack</div>
      </div>
      {#if data.pendingDispatches > 0}
        <div class="kpi-urgent-ring"></div>
      {/if}
    </div>

    <div
      class="kpi kpi-incidents {data.openIncidents.some(
        (i) => i.severity === 'CRITICAL',
      )
        ? 'critical'
        : ''}"
    >
      <div class="kpi-inner">
        <div class="kpi-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
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
        </div>
        <div class="kpi-lbl">Open Incidents</div>
        <div class="kpi-val {data.openIncidents.length > 0 ? 'red' : ''}">
          {data.openIncidents.length}
        </div>
        <div class="kpi-meta">
          {data.openIncidents.filter((i) => i.severity === "CRITICAL").length >
          0
            ? `${data.openIncidents.filter((i) => i.severity === "CRITICAL").length} critical`
            : "no critical"}
        </div>
      </div>
    </div>
  </div>

  <!-- ── Main content grid ──────────────────────────────────────────────────── -->
  <div class="content-grid">
    <!-- ── Trips table (wide) ───────────────────────────────────────────────── -->
    <div class="panel panel-trips">
      <div class="panel-hd">
        <div>
          <div class="panel-ey">Live & Recent</div>
          <div class="panel-ti">Trips</div>
        </div>
        <a href="/operator/trips" class="panel-link">View all →</a>
      </div>

      {#if data.recentTrips.length === 0}
        <div class="empty-state">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            opacity="0.2"
          >
            <rect x="1" y="3" width="15" height="13" /><path
              d="M16 8h4l3 3v5h-7z"
            />
          </svg>
          <span>No trips today yet</span>
        </div>
      {:else}
        <div class="t-scroll">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Route</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Revenue</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {#each data.recentTrips as trip}
                {@const s = STATUS_CONFIG[trip.status]}
                <tr>
                  <td>
                    <span class="plate-badge">{trip.vehiclePlate}</span>
                  </td>
                  <td class="route-cell">{trip.route}</td>
                  <td class="driver-cell">{trip.driver}</td>
                  <td>
                    <span
                      class="s-pill"
                      style="color:{s.color};background:{s.bg}"
                    >
                      {#if s.pulse}<span
                          class="pulse-dot"
                          style="background:{s.color}"
                        ></span>{/if}
                      {s.label}
                    </span>
                  </td>
                  <td>
                    <span class="rev-val"
                      >KES {trip.revenueKes.toLocaleString()}</span
                    >
                  </td>
                  <td class="time-cell">{timeAgo(trip.departedAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- ── Right column ─────────────────────────────────────────────────────── -->
    <div class="right-col">
      <!-- Incidents -->
      <div class="panel panel-incidents">
        <div class="panel-hd">
          <div>
            <div class="panel-ey">Fleet Alerts</div>
            <div class="panel-ti">Incidents</div>
          </div>
          <a href="/operator/notifications" class="panel-link">All →</a>
        </div>

        {#if data.openIncidents.length === 0}
          <div class="empty-state small">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              opacity="0.2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline
                points="22 4 12 14.01 9 11.01"
              />
            </svg>
            <span>All clear</span>
          </div>
        {:else}
          <div class="incident-list">
            {#each data.openIncidents.slice(0, 5) as inc}
              {@const sev = SEV_CONFIG[inc.severity]}
              <div class="inc-row">
                <div class="inc-sev-bar" style="background:{sev.color}"></div>
                <div class="inc-body">
                  <div class="inc-top">
                    <span class="inc-plate">{inc.vehiclePlate}</span>
                    <span class="inc-sev" style="color:{sev.color}"
                      >{sev.label}</span
                    >
                  </div>
                  <div class="inc-desc">{inc.description}</div>
                  <div class="inc-time">{timeAgo(inc.createdAt)}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Fuel alerts -->
      <div class="panel panel-fuel">
        <div class="panel-hd">
          <div>
            <div class="panel-ey">Refuel Needed</div>
            <div class="panel-ti">Fuel Status</div>
          </div>
          <a href="/operator/fuel" class="panel-link">Log →</a>
        </div>

        {#if data.fuelAlerts.length === 0}
          <div class="empty-state small">
            <span>All vehicles fuelled</span>
          </div>
        {:else}
          <div class="fuel-list">
            {#each data.fuelAlerts as f}
              {@const c = fuelColor(f.fuelPct)}
              <div class="fuel-row">
                <div class="fuel-left">
                  <span class="fuel-plate">{f.plate}</span>
                  <span class="fuel-days">{f.lastFillDaysAgo}d ago</span>
                </div>
                <div class="fuel-bar-wrap">
                  <div class="fuel-bar-track">
                    <div
                      class="fuel-bar-fill"
                      style="width:{f.fuelPct}%; background:{c}"
                    ></div>
                  </div>
                  <span class="fuel-pct" style="color:{c}">{f.fuelPct}%</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- ── Org slot breakdown (multi-org) ────────────────────────────────────── -->
  {#if orgSlots.length > 1}
    <div class="org-strip-wrap">
      <div class="org-strip-hd">
        <div class="panel-ey">Your Organisations</div>
        <div class="panel-ti">Fleet Allocation</div>
      </div>
      <div class="org-slot-grid">
        {#each orgSlots as slot}
          <a href="/operator/org/{slot.orgId}" class="org-slot">
            <div class="slot-av">{slot.orgName.slice(0, 2).toUpperCase()}</div>
            <div class="slot-info">
              <div class="slot-name">{slot.orgName}</div>
              <div class="slot-meta">
                {slot.assignedVehicleIds.length} / {slot.maxVehicles} vehicles
              </div>
            </div>
            <div class="slot-util">
              <div class="slot-bar-w">
                <div
                  class="slot-bar-f"
                  style="width:{Math.round(
                    (slot.assignedVehicleIds.length /
                      Math.max(slot.maxVehicles, 1)) *
                      100,
                  )}%"
                ></div>
              </div>
              <span class="slot-pct">
                {Math.round(
                  (slot.assignedVehicleIds.length /
                    Math.max(slot.maxVehicles, 1)) *
                    100,
                )}%
              </span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Page ── */
  .page {
    flex: 1;
    padding: 36px 40px;
    font-family: var(--font-body);
    min-width: 0;
  }

  /* ── Header ── */
  .page-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--orange, #f26522);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
  }
  .live-ring {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--orange, #f26522);
    position: relative;
  }
  .live-ring::after {
    content: "";
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid var(--orange, #f26522);
    animation: ring-pulse 2s ease-out infinite;
    opacity: 0;
  }
  @keyframes ring-pulse {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 2.5vw, 2.4rem);
    font-weight: 900;
    letter-spacing: -0.06em;
    color: var(--text-1);
    line-height: 1.05;
    margin-bottom: 5px;
  }
  .page-title em {
    font-style: normal;
    color: var(--orange, #f26522);
  }
  .page-sub {
    font-size: 0.82rem;
    color: var(--text-3);
  }
  .hd-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .org-switcher {
    display: flex;
    gap: 5px;
  }
  .org-chip {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 800;
    color: var(--text-2);
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.15s;
  }
  .org-chip.active {
    background: rgba(242, 101, 34, 0.12);
    border-color: rgba(242, 101, 34, 0.3);
    color: var(--orange, #f26522);
  }
  .org-chip.more {
    font-size: 0.55rem;
    color: var(--text-3);
  }
  .hd-actions {
    display: flex;
    gap: 8px;
  }
  .act-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.15s;
  }
  .act-btn.trips {
    background: rgba(242, 101, 34, 0.09);
    border: 1px solid rgba(242, 101, 34, 0.22);
    color: var(--orange, #f26522);
  }
  .act-btn.trips:hover {
    background: rgba(242, 101, 34, 0.16);
  }
  .act-btn.wallet {
    background: rgba(0, 176, 155, 0.07);
    border: 1px solid rgba(0, 176, 155, 0.2);
    color: var(--teal, #00b09b);
  }
  .act-btn.wallet:hover {
    background: rgba(0, 176, 155, 0.13);
  }

  /* ── KPI strip ── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 11px;
    margin-bottom: 20px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 18px;
    padding: 18px 18px 15px;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.2s,
      transform 0.18s;
  }
  .kpi:hover {
    transform: translateY(-2px);
    border-color: rgba(242, 101, 34, 0.2);
  }
  .kpi-inner {
    position: relative;
    z-index: 1;
  }
  .kpi-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange, #f26522);
    margin-bottom: 10px;
  }
  .kpi-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .kpi-val {
    font-family: var(--font-display);
    font-size: 1.65rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
    margin-bottom: 5px;
  }
  .kpi-val.teal {
    color: var(--teal, #00b09b);
  }
  .kpi-val.amber {
    color: #facc15;
  }
  .kpi-val.red {
    color: #f87171;
  }
  .kpi-meta {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  /* Revenue shimmer */
  .kpi-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(242, 101, 34, 0.04) 0%,
      transparent 50%
    );
    pointer-events: none;
  }
  /* Urgent dispatch ring */
  .kpi-urgent-ring {
    position: absolute;
    inset: 0;
    border-radius: 17px;
    border: 1px solid rgba(250, 204, 21, 0.3);
    animation: urgent-blink 1.5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes urgent-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }
  .kpi.critical {
    border-color: rgba(248, 113, 113, 0.3);
  }

  /* ── Content grid ── */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 14px;
    margin-bottom: 14px;
  }
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Panels ── */
  .panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 18px;
    overflow: hidden;
  }
  .panel::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  .panel-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
  }
  .panel-ey {
    font-size: 0.56rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .panel-ti {
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .panel-link {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--orange, #f26522);
    text-decoration: none;
    opacity: 0.75;
    transition: opacity 0.15s;
  }
  .panel-link:hover {
    opacity: 1;
  }

  /* ── Empty states ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 20px;
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .empty-state.small {
    padding: 16px 20px;
    flex-direction: row;
    gap: 7px;
    justify-content: flex-start;
    padding-left: 20px;
  }

  /* ── Trips table ── */
  .t-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    white-space: nowrap;
  }
  th {
    padding: 8px 16px;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    text-align: left;
    border-bottom: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    background: rgba(255, 255, 255, 0.01);
  }
  td {
    padding: 11px 16px;
    color: var(--text-2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }

  .plate-badge {
    font-family: "Courier New", monospace;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-1);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 2px 7px;
    letter-spacing: 0.04em;
  }
  .route-cell {
    color: var(--text-1);
    font-weight: 600;
    font-size: 0.82rem;
  }
  .driver-cell {
    font-size: 0.78rem;
  }
  .time-cell {
    font-size: 0.68rem;
    color: var(--text-3);
  }

  .s-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
  }
  .pulse-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    animation: pdot 1.4s ease-in-out infinite;
  }
  @keyframes pdot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }

  .rev-val {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-1);
  }

  /* ── Incidents ── */
  .incident-list {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .inc-row {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 11px;
    transition: background 0.15s;
  }
  .inc-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .inc-sev-bar {
    width: 3px;
    border-radius: 3px;
    flex-shrink: 0;
    min-height: 36px;
  }
  .inc-body {
    flex: 1;
    min-width: 0;
  }
  .inc-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;
  }
  .inc-plate {
    font-family: "Courier New", monospace;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .inc-sev {
    font-size: 0.56rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .inc-desc {
    font-size: 0.72rem;
    color: var(--text-2);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .inc-time {
    font-size: 0.6rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  /* ── Fuel ── */
  .fuel-list {
    padding: 0 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fuel-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 11px;
  }
  .fuel-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 72px;
    flex-shrink: 0;
  }
  .fuel-plate {
    font-family: "Courier New", monospace;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .fuel-days {
    font-size: 0.56rem;
    color: var(--text-3);
  }
  .fuel-bar-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fuel-bar-track {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }
  .fuel-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .fuel-pct {
    font-size: 0.68rem;
    font-weight: 700;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Org slot grid ── */
  .org-strip-wrap {
    margin-bottom: 14px;
  }
  .org-strip-hd {
    margin-bottom: 12px;
  }
  .org-slot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .org-slot {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim, rgba(255, 255, 255, 0.07));
    border-radius: 14px;
    text-decoration: none;
    transition: all 0.15s;
  }
  .org-slot:hover {
    border-color: rgba(242, 101, 34, 0.2);
    background: rgba(242, 101, 34, 0.04);
    transform: translateY(-1px);
  }
  .slot-av {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--orange, #f26522);
    flex-shrink: 0;
  }
  .slot-info {
    flex: 1;
    min-width: 0;
  }
  .slot-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }
  .slot-meta {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  .slot-util {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }
  .slot-bar-w {
    width: 40px;
    height: 3px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .slot-bar-f {
    height: 100%;
    background: var(--orange, #f26522);
    border-radius: 2px;
    transition: width 0.4s;
  }
  .slot-pct {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--text-3);
    width: 28px;
    text-align: right;
  }

  /* ── Responsive ── */
  @media (max-width: 1280px) {
    .kpi-strip {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 1024px) {
    .page {
      padding: 24px 20px;
    }
    .content-grid {
      grid-template-columns: 1fr;
    }
    .right-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 860px) {
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .right-col {
      grid-template-columns: 1fr;
    }
    .hd-actions {
      display: none;
    }
  }
</style>
