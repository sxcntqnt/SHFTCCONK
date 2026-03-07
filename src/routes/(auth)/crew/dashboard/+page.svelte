<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { authStore } from "$lib/features/auth/stores/auth"
  import {
    isLoadingFavorites,
    loadFavoriteData,
  } from "$lib/features/dashboard/stores/DashboardStore"
  import NextTripCard from "$lib/components/NextTripCard.svelte"
  import QuickPlanner from "$lib/components/QuickPlanner.svelte"
  import InsightsSnapshot from "$lib/components/InsightsSnapshot.svelte"
  import TipCrew from "$lib/components/TipCrew.svelte"
  import RateCrew from "$lib/components/RateCrew.svelte"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  /* ── Mock data ──────────────────────────────────────────── */
  interface Incident {
    id: string
    type: string
    route: string
    time: string
    status: "open" | "resolved" | "pending"
  }
  interface TipEntry {
    from: string
    amount: number
    note?: string
    time: string
  }

  let todayEarnings = $state(4_820)
  let weeklyTrips = $state(34)
  let onTimeRate = $state(91)
  let tipBalance = $state(1_150)
  let pendingTips = $state(3)

  let incidents = $state<Incident[]>([
    {
      id: "I-001",
      type: "Passenger dispute",
      route: "58 Buru → CBD",
      time: "09:14",
      status: "open",
    },
    {
      id: "I-002",
      type: "Vehicle breakdown",
      route: "23 Ngong Rd",
      time: "Yesterday",
      status: "resolved",
    },
    {
      id: "I-003",
      type: "Fare discrepancy",
      route: "46 Rongai",
      time: "Mon",
      status: "pending",
    },
  ])
  let recentTips = $state<TipEntry[]>([
    {
      from: "Passenger #4471",
      amount: 50,
      note: "Great service!",
      time: "11:30",
    },
    {
      from: "Passenger #2190",
      amount: 100,
      note: "Smooth ride",
      time: "09:05",
    },
    { from: "Passenger #8820", amount: 30, time: "Yesterday" },
  ])

  const STATUS_CFG = {
    open: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
    },
    pending: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.22)",
    },
    resolved: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.1)",
      border: "rgba(0,176,155,0.22)",
    },
  }

  /* ── Nav ────────────────────────────────────────────────── */
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/incidents",
      badge: 1,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/tipjar",
      badge: pendingTips,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]

  function isActive(href: string) {
    if (href === "/dashboard") return currentPath === "/dashboard"
    return currentPath.startsWith(href)
  }

  function greet() {
    const h = new Date().getHours()
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
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

  onMount(() => {
    if (browser) {
      loadFavoriteData()
      setTimeout(() => (loading = false), 350)
    }
  })
</script>

<svelte:head><title>Crew Dashboard — Matatu Pulse</title></svelte:head>

<!-- Mobile overlay -->
<div
  class="m-overlay {mobileOpen ? 'open' : ''}"
  onclick={() => (mobileOpen = false)}
>
  <div class="m-panel" onclick={(e) => e.stopPropagation()}>
    <div class="m-head">
      <div class="sb-logo" style="padding:0;border:none;">
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
      ><span class="role-dot"></span>Crew</span
    >
    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
          onclick={() => (mobileOpen = false)}
        >
          {@html item.icon}{item.label}
          {#if item.badge}<span class="nav-badge">{item.badge}</span>{/if}
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

    <span class="role-badge"><span class="role-dot"></span>Crew</span>

    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
        >
          {@html item.icon}{item.label}
          {#if item.badge}<span class="nav-badge">{item.badge}</span>{/if}
        </a>
      {/each}
    </nav>

    <div class="sb-footer">
      {#if user}
        <div class="user-card">
          <div class="user-av">{initials(user.fullName)}</div>
          <div>
            <div class="user-name">{user.fullName ?? "Crew Member"}</div>
            <div class="user-role-lbl">Driver / Conductor</div>
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
    <!-- Topbar -->
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
            >{navItems.find((n) => isActive(n.href))?.label ??
              "Dashboard"}</span
          >
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      <!-- Page header -->
      <div class="page-hd">
        <div class="eyebrow"><span class="live-dot"></span>Crew Dashboard</div>
        <h1 class="page-title">
          {greet()}, <em>{user?.fullName?.split(" ")[0] ?? "Driver"}</em>
        </h1>
        <p class="page-sub">
          {new Date().toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })} · Your shift overview
        </p>
      </div>

      {#if loading}
        <div class="loading"><span class="spinner"></span>Loading…</div>
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
              >Today's Earnings
            </div>
            <div class="kpi-val">KES {todayEarnings.toLocaleString()}</div>
            <div class="kpi-meta">+12% vs yesterday</div>
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
              >Weekly Trips
            </div>
            <div class="kpi-val">{weeklyTrips}</div>
            <div class="kpi-meta">Across 3 routes</div>
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
                ><circle cx="12" cy="12" r="10" /><polyline
                  points="12 6 12 12 16 14"
                /></svg
              >On-Time Rate
            </div>
            <div
              class="kpi-val"
              style="color:{onTimeRate >= 85 ? 'var(--teal)' : '#facc15'}"
            >
              {onTimeRate}%
            </div>
            <div class="kpi-meta">Last 7 days</div>
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
                ><path
                  d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                /></svg
              >Tip Balance
            </div>
            <div class="kpi-val" style="color:var(--teal)">
              KES {tipBalance.toLocaleString()}
            </div>
            <div class="kpi-meta">{pendingTips} new tips</div>
          </div>
        </div>

        <!-- Trip + Planner -->
        <div class="trip-row">
          <NextTripCard />
          <QuickPlanner />
        </div>

        <!-- Insights -->
        <div class="insights-row"><InsightsSnapshot /></div>

        <!-- Incidents + Tip Jar -->
        <div class="two-col">
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Recent</div>
                <div class="card-ti">Incidents</div>
              </div>
              <a href="/incidents/new" class="report-btn">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  ><line x1="12" y1="5" x2="12" y2="19" /><line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  /></svg
                >
                Report
              </a>
            </div>
            <div class="inc-list">
              {#each incidents as inc}
                {@const s = STATUS_CFG[inc.status]}
                <div class="inc-row">
                  <span class="inc-id">{inc.id}</span>
                  <div class="inc-info">
                    <div class="inc-type">{inc.type}</div>
                    <div class="inc-route">{inc.route}</div>
                  </div>
                  <span
                    class="s-pill"
                    style="color:{s.color};background:{s.bg};border:1px solid {s.border}"
                    >{inc.status}</span
                  >
                  <span class="inc-time">{inc.time}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Pending Balance</div>
                <div class="card-ti">Tip Jar</div>
              </div>
              <a href="/tipjar" class="link-sm">Manage →</a>
            </div>
            <div class="tip-balance">
              <span class="t-cur">KES</span>
              <span class="t-amt">{tipBalance.toLocaleString()}</span>
              <span class="t-lbl">available</span>
            </div>
            <div class="tip-list">
              {#each recentTips as tip}
                <div class="tip-row">
                  <div class="tip-av">{tip.from.slice(-2)}</div>
                  <div class="tip-inf">
                    <div class="tip-from">{tip.from}</div>
                    <div class="tip-note">{tip.note ?? tip.time}</div>
                  </div>
                  <span class="tip-amt">+{tip.amount}</span>
                </div>
              {/each}
            </div>
            <a href="/tipjar/withdraw" class="withdraw">Withdraw Funds</a>
          </div>
        </div>

        <!-- Crew support -->
        <div class="crew-grid">
          <TipCrew
            driverName="Selected Driver"
            conductorName="Selected Conductor"
            onTip={(d, c) => console.log(`Tip D:${d} C:${c}`)}
          />
          <RateCrew onRate={(s, t) => console.log(`Rated ${s}:`, t)} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ─────────────── SHELL ─────────────── */
  .shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  /* ─────────────── SIDEBAR ─────────────── */
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
    gap: 6px;
  }
  .logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--teal), #005c52);
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
    background: rgba(0, 176, 155, 0.09);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .role-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
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
    background: rgba(0, 176, 155, 0.09);
    border-color: rgba(0, 176, 155, 0.2);
    color: var(--teal);
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
    background: var(--teal);
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
    background: linear-gradient(135deg, var(--teal), #005c52);
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

  /* ─────────────── MOBILE ─────────────── */
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

  /* ─────────────── MAIN ─────────────── */
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

  .shift-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--teal);
  }
  .shift-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-s 2s ease-out infinite;
  }
  @keyframes pulse-s {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  .content {
    flex: 1;
    padding: 36px 40px;
  }

  /* ─────────────── PAGE ─────────────── */
  .page-hd {
    margin-bottom: 28px;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--teal);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-l 2s ease-out infinite;
  }
  @keyframes pulse-l {
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
    color: var(--teal);
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 22px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    border-color: rgba(0, 176, 155, 0.22);
    transform: translateY(-2px);
  }
  .kpi-lbl {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .kpi-lbl svg {
    color: var(--teal);
  }
  .kpi-val {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
  }
  .kpi-meta {
    font-size: 0.65rem;
    color: var(--text-3);
  }

  .trip-row {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .insights-row {
    margin-bottom: 14px;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .crew-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* Section cards */
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

  .report-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 9px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    font-size: 0.7rem;
    font-weight: 700;
    color: #f87171;
    text-decoration: none;
    transition: background 0.15s;
  }
  .report-btn:hover {
    background: rgba(248, 113, 113, 0.15);
  }

  /* Incidents */
  .inc-list {
    padding: 0 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .inc-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }
  .inc-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .inc-id {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--text-3);
    font-family: monospace;
    width: 44px;
    flex-shrink: 0;
  }
  .inc-info {
    flex: 1;
    min-width: 0;
  }
  .inc-type {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .inc-route {
    font-size: 0.65rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .s-pill {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .inc-time {
    font-size: 0.62rem;
    color: var(--text-3);
    white-space: nowrap;
  }

  /* Tip jar */
  .tip-balance {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--rim);
  }
  .t-cur {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--teal);
  }
  .t-amt {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    color: var(--text-1);
  }
  .t-lbl {
    font-size: 0.68rem;
    color: var(--text-3);
    margin-left: 4px;
  }
  .tip-list {
    padding: 9px 11px 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .tip-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 9px;
    border-radius: 9px;
    background: rgba(0, 176, 155, 0.04);
    border: 1px solid rgba(0, 176, 155, 0.08);
  }
  .tip-av {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58rem;
    font-weight: 800;
    color: var(--teal);
  }
  .tip-inf {
    flex: 1;
    min-width: 0;
  }
  .tip-from {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .tip-note {
    font-size: 0.62rem;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tip-amt {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--teal);
  }
  .withdraw {
    display: block;
    margin: 0 11px 11px;
    padding: 10px;
    text-align: center;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--teal);
    text-decoration: none;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.15s;
  }
  .withdraw:hover {
    background: rgba(0, 176, 155, 0.18);
    transform: translateY(-1px);
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
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
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
    .trip-row,
    .two-col,
    .crew-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
