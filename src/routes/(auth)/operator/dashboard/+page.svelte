<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { authStore } from "$lib/features/auth/stores/auth"
  import FleetMap from "$lib/components/FleetMap.svelte"
  import Analytics from "$lib/components/Analytics.svelte"
  import Contracts from "$lib/components/Contracts.svelte"
  import { initFleet } from "$lib/features/fleet/stores/fleet"
  import { initContracts } from "$lib/features/contracts/contracts"
  import { initAnalytics } from "$lib/features/analytics/+analytics"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  /* ── Mock data ──────────────────────────────────────────── */
  interface Trip {
    id: string
    route: string
    driver: string
    status: "active" | "completed" | "delayed"
    revenue: number
    time: string
  }
  interface Notif {
    id: string
    type: "fuel" | "incident" | "system" | "payment"
    msg: string
    time: string
    read: boolean
  }
  interface FuelRecord {
    vehicle: string
    level: number
    lastFill: string
  }

  let todayRevenue = $state(128_400)
  let activeVehicles = $state(14)
  let totalTrips = $state(87)
  let avgFuel = $state(62)
  let unreadNotifs = $state(4)

  let trips = $state<Trip[]>([
    {
      id: "T-441",
      route: "58 Buru → CBD",
      driver: "Kamau M.",
      status: "active",
      revenue: 4_820,
      time: "Now",
    },
    {
      id: "T-440",
      route: "23 Ngong Rd",
      driver: "Odhiambo S.",
      status: "delayed",
      revenue: 3_200,
      time: "11:30",
    },
    {
      id: "T-439",
      route: "46 Rongai",
      driver: "Njoroge P.",
      status: "completed",
      revenue: 5_600,
      time: "10:15",
    },
    {
      id: "T-438",
      route: "34 Thika Rd",
      driver: "Wanjiku A.",
      status: "completed",
      revenue: 4_100,
      time: "09:40",
    },
    {
      id: "T-437",
      route: "12 Westlands",
      driver: "Kipchoge L.",
      status: "active",
      revenue: 2_950,
      time: "Now",
    },
  ])

  let notifications = $state<Notif[]>([
    {
      id: "N-1",
      type: "fuel",
      msg: "KDA 787D fuel below 20% — schedule refill",
      time: "5m ago",
      read: false,
    },
    {
      id: "N-2",
      type: "incident",
      msg: "Incident I-004 filed by Conductor Aisha",
      time: "22m ago",
      read: false,
    },
    {
      id: "N-3",
      type: "payment",
      msg: "KES 12,400 disbursement cleared — Equity",
      time: "1h ago",
      read: false,
    },
    {
      id: "N-4",
      type: "system",
      msg: "GPS telemetry gap: KBZ 441C offline 14min",
      time: "2h ago",
      read: false,
    },
    {
      id: "N-5",
      type: "fuel",
      msg: "KCE 887A refuelled — 45L at Total Karen",
      time: "Yesterday",
      read: true,
    },
  ])

  let fuelRecords = $state<FuelRecord[]>([
    { vehicle: "KDA 787D", level: 18, lastFill: "2 days ago" },
    { vehicle: "KBZ 441C", level: 74, lastFill: "Today" },
    { vehicle: "KCE 887A", level: 55, lastFill: "Today" },
    { vehicle: "KDA 302F", level: 32, lastFill: "3 days ago" },
    { vehicle: "KCJ 101B", level: 88, lastFill: "Today" },
  ])

  const TRIP_STATUS = {
    active: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.09)",
      border: "rgba(0,176,155,0.22)",
      pulse: true,
    },
    completed: {
      color: "#9ca3af",
      bg: "rgba(156,163,175,0.07)",
      border: "rgba(156,163,175,0.14)",
      pulse: false,
    },
    delayed: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.09)",
      border: "rgba(250,204,21,0.22)",
      pulse: false,
    },
  }
  const NOTIF_ICON: Record<string, string> = {
    fuel: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18M3 17h18M7 3v18M17 3v18"/></svg>`,
    incident: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>`,
    payment: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    system: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`,
  }
  const NOTIF_COLOR: Record<string, string> = {
    fuel: "#facc15",
    incident: "#f87171",
    payment: "var(--teal)",
    system: "#9ca3af",
  }

  function fuelColor(n: number) {
    return n > 50 ? "var(--teal)" : n > 25 ? "#facc15" : "#f87171"
  }

  function markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }))
    unreadNotifs = 0
  }

  function initials(name?: string | null) {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  /* ── Nav ────────────────────────────────────────────────── */
  const navItems = [
    {
      key: "fuel",
      label: "Fuel",
      href: "/fuel",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h18M3 17h18M7 3v18M17 3v18"/></svg>`,
    },
    {
      key: "notifications",
      label: "Notifications",
      href: "/notifications",
      badge: unreadNotifs,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
    },
    {
      key: "trips",
      label: "Trips",
      href: "/trips",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    },
  ]

  /* Synthetic "home" item — maps /operator or /operator/dashboard */
  const homeItem = {
    key: "home",
    label: "Dashboard",
    href: "/operator",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  }

  const allNavItems = [homeItem, ...navItems]

  function isActive(href: string) {
    if (href === "/operator")
      return (
        currentPath === "/operator" || currentPath === "/operator/dashboard"
      )
    return currentPath.startsWith(href)
  }

  onMount(async () => {
    if (browser) {
      try {
        await Promise.all([initFleet(), initContracts(), initAnalytics()])
      } catch {}
      setTimeout(() => (loading = false), 380)
    }
  })
</script>

<svelte:head><title>Operator Dashboard — Matatu Pulse</title></svelte:head>

<!-- Mobile overlay -->
<div
  class="m-overlay {mobileOpen ? 'open' : ''}"
  onclick={() => (mobileOpen = false)}
>
  <div class="m-panel" onclick={(e) => e.stopPropagation()}>
    <div class="m-head">
      <div class="sb-logo" style="padding:0;border:none;gap:8px;">
        <div class="logo-mark">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
            ><rect x="1" y="3" width="15" height="13" /><path
              d="M16 8h4l3 3v5h-7z"
            /></svg
          >
        </div>
        <span class="logo-text">Matatu<span>PL</span></span>
      </div>
      <button class="close-x" onclick={() => (mobileOpen = false)}>✕</button>
    </div>
    <span class="role-badge" style="margin:14px 14px 0"
      ><span class="role-dot"></span>Operator</span
    >
    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each allNavItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
          onclick={() => (mobileOpen = false)}
        >
          {@html item.icon}{item.label}
          {#if "badge" in item && item.badge}<span class="nav-badge"
              >{item.badge}</span
            >{/if}
        </a>
      {/each}
    </nav>
  </div>
</div>

<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sb-logo">
      <div class="logo-mark">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
          ><rect x="1" y="3" width="15" height="13" /><path
            d="M16 8h4l3 3v5h-7z"
          /></svg
        >
      </div>
      <span class="logo-text">Matatu<span>PL</span></span>
    </div>
    <span class="role-badge"><span class="role-dot"></span>Operator</span>
    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each allNavItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
        >
          {@html item.icon}{item.label}
          {#if "badge" in item && item.badge}<span class="nav-badge"
              >{item.badge}</span
            >{/if}
        </a>
      {/each}
    </nav>
    <div class="sb-footer">
      {#if user}
        <div class="user-card">
          <div class="user-av">{initials(user.fullName)}</div>
          <div>
            <div class="user-name">{user.fullName ?? "Operator"}</div>
            <div class="user-role-lbl">Fleet Operator</div>
          </div>
        </div>
      {/if}
      <a href="/account/sign_out" class="sign-out">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >
        Sign Out
      </a>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="tb-left">
        <button class="hamburger" onclick={() => (mobileOpen = true)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><line x1="3" y1="6" x2="21" y2="6" /><line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            /><line x1="3" y1="18" x2="21" y2="18" /></svg
          >
        </button>
        <nav class="breadcrumb">
          <a href="/">Home</a><span class="bc-sep">›</span>
          <span class="bc-cur"
            >{allNavItems.find((n) => isActive(n.href))?.label ??
              "Dashboard"}</span
          >
        </nav>
      </div>
      <div class="conn-pill"><span class="conn-dot"></span>Live Fleet</div>
    </div>

    <div class="content">
      <div class="page-hd">
        <div>
          <div class="eyebrow">
            <span class="live-dot"></span>Operator Dashboard
          </div>
          <h1 class="page-title">Fleet <em>Command</em></h1>
          <p class="page-sub">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })} · Live operations
          </p>
        </div>
        <div class="hd-actions">
          <a href="/fuel" class="action-btn btn-fuel">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="M3 7h18M3 17h18M7 3v18M17 3v18" /></svg
            >
            Fuel Log
          </a>
          <a href="/trips" class="action-btn btn-trips">
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
        </div>
      </div>

      {#if loading}
        <div class="loading">
          <span class="spinner"></span>Loading fleet data…
        </div>
      {:else}
        <!-- KPIs -->
        <div class="kpi-strip">
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><line x1="12" y1="1" x2="12" y2="23" /><path
                  d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                /></svg
              >Revenue Today
            </div>
            <div class="kpi-val">KES {(todayRevenue / 1000).toFixed(1)}K</div>
            <div class="kpi-meta">+8% vs yesterday</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><rect x="1" y="3" width="15" height="13" /><path
                  d="M16 8h4l3 3v5h-7z"
                /></svg
              >Active Vehicles
            </div>
            <div class="kpi-val" style="color:var(--teal)">
              {activeVehicles}
            </div>
            <div class="kpi-meta">of 18 fleet</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M14 2v6h6" /><path d="M4 20h16" /></svg
              >Trips Today
            </div>
            <div class="kpi-val">{totalTrips}</div>
            <div class="kpi-meta">across 5 routes</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M3 7h18M3 17h18M7 3v18M17 3v18" /></svg
              >Avg Fuel
            </div>
            <div class="kpi-val" style="color:{fuelColor(avgFuel)}">
              {avgFuel}%
            </div>
            <div class="kpi-meta">fleet average</div>
          </div>
          <div class="kpi">
            {#if unreadNotifs > 0}<div class="notif-badge">
                {unreadNotifs}
              </div>{/if}
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path
                  d="M13.73 21a2 2 0 01-3.46 0"
                /></svg
              >Notifications
            </div>
            <div class="kpi-val" style="color:var(--orange)">
              {unreadNotifs}
            </div>
            <div class="kpi-meta">unread alerts</div>
          </div>
        </div>

        <!-- Trips + Notifications -->
        <div class="two-col">
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Live & Recent</div>
                <div class="card-ti">Trips</div>
              </div>
              <a href="/trips" class="link-sm">View all →</a>
            </div>
            <div class="t-scroll">
              <table>
                <thead
                  ><tr
                    ><th>ID</th><th>Route</th><th>Driver</th><th>Status</th><th
                      >Revenue</th
                    ><th>Time</th></tr
                  ></thead
                >
                <tbody>
                  {#each trips as t}
                    {@const s = TRIP_STATUS[t.status]}
                    <tr>
                      <td
                        style="font-family:monospace;font-size:0.7rem;color:var(--text-3)"
                        >{t.id}</td
                      >
                      <td style="color:var(--text-1);font-weight:600"
                        >{t.route}</td
                      >
                      <td>{t.driver}</td>
                      <td>
                        <span
                          class="s-pill"
                          style="color:{s.color};background:{s.bg};border:1px solid {s.border}"
                        >
                          {#if s.pulse}<span class="pulse-dot"></span>{/if}
                          {t.status}
                        </span>
                      </td>
                      <td
                        ><span class="rev-cell"
                          >KES {t.revenue.toLocaleString()}</span
                        ></td
                      >
                      <td style="color:var(--text-3);font-size:0.7rem"
                        >{t.time}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Fleet Alerts</div>
                <div class="card-ti">Notifications</div>
              </div>
              <button class="mark-read" onclick={markAllRead}
                >Mark all read</button
              >
            </div>
            <div class="notif-list">
              {#each notifications as n}
                <div class="notif-row {n.read ? '' : 'unread'}">
                  <div class="notif-icon" style="color:{NOTIF_COLOR[n.type]}">
                    {@html NOTIF_ICON[n.type]}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div class="notif-msg">{n.msg}</div>
                    <div class="notif-time">{n.time}</div>
                  </div>
                  {#if !n.read}<div class="unread-dot"></div>{/if}
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Fuel -->
        <div class="full-row card">
          <div class="card-hd">
            <div>
              <div class="card-ey">Fleet Status</div>
              <div class="card-ti">Fuel Levels</div>
            </div>
            <a href="/fuel" class="link-sm">Full log →</a>
          </div>
          <div class="fuel-list">
            {#each fuelRecords as f}
              <div class="fuel-row">
                <span class="fuel-veh">{f.vehicle}</span>
                <div class="fuel-bar-w">
                  <div
                    class="fuel-bar"
                    style="width:{f.level}%;background:{fuelColor(f.level)}"
                  ></div>
                </div>
                <span class="fuel-pct" style="color:{fuelColor(f.level)}"
                  >{f.level}%</span
                >
                <span class="fuel-meta">{f.lastFill}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Fleet Map -->
        <div class="full-row card">
          <div class="card-hd">
            <div>
              <div class="card-ey">Live GPS</div>
              <div class="card-ti">Fleet Map</div>
            </div>
          </div>
          <div style="padding:0 0 4px">
            <FleetMap />
          </div>
        </div>

        <!-- Contracts + Analytics -->
        <div class="two-col">
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Assignments</div>
                <div class="card-ti">Contracts</div>
              </div>
            </div>
            <div style="padding:0 16px 16px"><Contracts /></div>
          </div>
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Performance</div>
                <div class="card-ti">Analytics</div>
              </div>
            </div>
            <div style="padding:0 16px 16px"><Analytics /></div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ─────── SHELL ─────── */
  .shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  /* ─────── SIDEBAR ─────── */
  .sidebar {
    width: 228px;
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .sidebar::-webkit-scrollbar {
    display: none;
  }

  .sb-logo {
    padding: 22px 20px 16px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--orange), #c4420c);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-text {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .logo-text span {
    color: var(--orange);
  }

  .role-badge {
    margin: 14px 14px 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(242, 101, 34, 0.09);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 100px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
  }
  .role-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--orange);
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .sec-label {
    padding: 18px 20px 7px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .sb-nav {
    padding: 2px 10px;
    flex: 1;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-2);
    text-decoration: none;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
    position: relative;
  }
  .nav-link :global(svg) {
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  .nav-link:hover {
    background: var(--rim);
    color: var(--text-1);
  }
  .nav-link:hover :global(svg) {
    opacity: 0.9;
  }
  .nav-link.active {
    background: rgba(242, 101, 34, 0.09);
    border-color: rgba(242, 101, 34, 0.2);
    color: var(--orange);
    font-weight: 600;
  }
  .nav-link.active :global(svg) {
    opacity: 1;
  }
  .nav-link.active::before {
    content: "";
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    border-radius: 0 3px 3px 0;
    background: var(--orange);
  }

  .nav-badge {
    margin-left: auto;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: var(--orange);
    font-size: 0.6rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .sb-footer {
    padding: 12px 10px;
    border-top: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .user-card {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 11px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 6px;
  }
  .user-av {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--orange), #c4420c);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 800;
    color: #fff;
  }
  .user-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .user-role-lbl {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  .sign-out {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 11px;
    border-radius: 9px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sign-out:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #f87171;
  }

  /* ─────── MOBILE ─────── */
  .m-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(6px);
  }
  .m-overlay.open {
    display: block;
  }
  .m-panel {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 228px;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .m-head {
    padding: 18px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .close-x {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--rim);
    border: none;
    cursor: pointer;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .close-x:hover {
    background: var(--rim-2);
  }

  /* ─────── MAIN ─────── */
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    height: 52px;
    padding: 0 32px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 12, 0.75);
    backdrop-filter: blur(16px);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }
  .tb-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-2);
    padding: 5px;
    border-radius: 8px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .hamburger:hover {
    background: var(--rim);
    color: var(--text-1);
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .breadcrumb a {
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.15s;
  }
  .breadcrumb a:hover {
    color: var(--text-2);
  }
  .bc-sep {
    opacity: 0.35;
  }
  .bc-cur {
    color: var(--text-1);
    font-weight: 500;
  }

  .conn-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    background: rgba(242, 101, 34, 0.07);
    border: 1px solid rgba(242, 101, 34, 0.15);
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--orange);
  }
  .conn-dot {
    width: 5px;
    height: 5px;
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

  .content {
    flex: 1;
    padding: 36px 40px;
  }

  /* ─────── PAGE ─────── */
  .page-hd {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 28px;
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
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    animation: pulse-o2 2s ease-out infinite;
  }
  @keyframes pulse-o2 {
    0% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(242, 101, 34, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(242, 101, 34, 0);
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 5px;
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
  .hd-actions {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
  }
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s;
  }
  .btn-fuel {
    background: rgba(250, 204, 21, 0.08);
    border: 1px solid rgba(250, 204, 21, 0.2);
    color: #facc15;
  }
  .btn-fuel:hover {
    background: rgba(250, 204, 21, 0.14);
  }
  .btn-trips {
    background: rgba(242, 101, 34, 0.09);
    border: 1px solid rgba(242, 101, 34, 0.22);
    color: var(--orange);
  }
  .btn-trips:hover {
    background: rgba(242, 101, 34, 0.15);
  }

  /* KPIs */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 11px;
    margin-bottom: 22px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 15px 17px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.2s,
      transform 0.18s;
  }
  .kpi::before {
    content: "";
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }
  .kpi:hover {
    border-color: rgba(242, 101, 34, 0.22);
    transform: translateY(-2px);
  }
  .kpi-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .kpi-lbl svg {
    color: var(--orange);
  }
  .kpi-val {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
  }
  .kpi-meta {
    font-size: 0.62rem;
    color: var(--text-3);
  }
  .notif-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: var(--orange);
    font-size: 0.58rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Grids */
  .two-col {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .full-row {
    margin-bottom: 14px;
  }

  /* Cards */
  .card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
  }
  .card::before {
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
  .card-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 11px;
  }
  .card-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .card-ti {
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .link-sm {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--orange);
    text-decoration: none;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .link-sm:hover {
    opacity: 1;
  }
  .mark-read {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--text-3);
    font-family: var(--font-body);
    transition: color 0.15s;
    padding: 0;
  }
  .mark-read:hover {
    color: var(--orange);
  }

  /* Trips table */
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
    padding: 9px 16px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    text-align: left;
    border-bottom: 1px solid var(--rim);
  }
  td {
    padding: 11px 16px;
    color: var(--text-2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
  .s-pill {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .pulse-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: trip-blink 1.5s ease-in-out infinite;
  }
  @keyframes trip-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
  }
  .rev-cell {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-1);
  }

  /* Notifications */
  .notif-list {
    padding: 0 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .notif-row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 9px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    transition: background 0.15s;
  }
  .notif-row.unread {
    background: rgba(255, 255, 255, 0.025);
    border-color: rgba(255, 255, 255, 0.05);
  }
  .notif-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .notif-icon {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .notif-msg {
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.45;
  }
  .notif-time {
    font-size: 0.63rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    flex-shrink: 0;
    margin-top: 6px;
  }

  /* Fuel bars */
  .fuel-list {
    padding: 0 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fuel-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .fuel-veh {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-1);
    font-family: monospace;
    width: 76px;
    flex-shrink: 0;
  }
  .fuel-bar-w {
    flex: 1;
    height: 5px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }
  .fuel-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s;
  }
  .fuel-pct {
    font-size: 0.7rem;
    font-weight: 700;
    width: 32px;
    text-align: right;
    flex-shrink: 0;
  }
  .fuel-meta {
    font-size: 0.62rem;
    color: var(--text-3);
    white-space: nowrap;
  }

  /* Loading */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 10px;
    color: var(--text-3);
    font-size: 0.82rem;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.07);
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .kpi-strip {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
    .hamburger {
      display: flex;
    }
    .topbar {
      padding: 0 20px;
    }
    .content {
      padding: 26px 20px;
    }
  }
  @media (max-width: 860px) {
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .two-col {
      grid-template-columns: 1fr;
    }
  }
</style>
