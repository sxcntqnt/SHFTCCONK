<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { authStore } from "$lib/features/auth/stores/auth"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  // ── Types ──────────────────────────────────────────────────────────────────
  type ReservationStatus =
    | "confirmed"
    | "pending"
    | "cancelled"
    | "boarded"
    | "no_show"
  type PaymentStatus = "paid" | "pending" | "failed" | "refunded"

  interface Reservation {
    id: string
    passengerName: string
    passengerPhone: string
    seats: number[]
    seatCount: number
    amount: number
    route: string
    departure: string // time string
    date: string
    status: ReservationStatus
    paymentStatus: PaymentStatus
    paymentRef: string
    bookedAt: string
    isNew?: boolean
  }

  // ── This crew's matatu identity ────────────────────────────────────────────
  // In production this comes from $page.data (load function tied to auth)
  const MY_MATATU = {
    plate: "KCA 812G",
    route: "58 Buru Buru → CBD",
    sacco: "Citi Hoppa",
    capacity: 14,
    routeCode: "58",
  }

  // ── Mock reservations for THIS matatu only ─────────────────────────────────
  let reservations = $state<Reservation[]>([
    {
      id: "RES-001",
      passengerName: "Amina Odhiambo",
      passengerPhone: "0712 345 678",
      seats: [3, 4],
      seatCount: 2,
      amount: 160,
      route: "58 Buru Buru → CBD",
      departure: "07:30",
      date: "Today",
      status: "confirmed",
      paymentStatus: "paid",
      paymentRef: "MPESA4G8K2L",
      bookedAt: "06:45",
      isNew: true,
    },
    {
      id: "RES-002",
      passengerName: "Brian Kamau",
      passengerPhone: "0723 456 789",
      seats: [1],
      seatCount: 1,
      amount: 80,
      route: "58 Buru Buru → CBD",
      departure: "07:30",
      date: "Today",
      status: "boarded",
      paymentStatus: "paid",
      paymentRef: "MPESA7H3N9P",
      bookedAt: "06:50",
      isNew: true,
    },
    {
      id: "RES-003",
      passengerName: "Cynthia Mwangi",
      passengerPhone: "0734 567 890",
      seats: [7, 8, 9],
      seatCount: 3,
      amount: 240,
      route: "58 Buru Buru → CBD",
      departure: "07:30",
      date: "Today",
      status: "pending",
      paymentStatus: "pending",
      paymentRef: "—",
      bookedAt: "07:10",
      isNew: true,
    },
    {
      id: "RES-004",
      passengerName: "David Otieno",
      passengerPhone: "0745 678 901",
      seats: [5],
      seatCount: 1,
      amount: 80,
      route: "58 Buru Buru → CBD",
      departure: "10:00",
      date: "Today",
      status: "confirmed",
      paymentStatus: "paid",
      paymentRef: "MPESA2K5R7T",
      bookedAt: "09:15",
    },
    {
      id: "RES-005",
      passengerName: "Eunice Njeri",
      passengerPhone: "0756 789 012",
      seats: [11, 12],
      seatCount: 2,
      amount: 160,
      route: "58 Buru Buru → CBD",
      departure: "10:00",
      date: "Today",
      status: "cancelled",
      paymentStatus: "refunded",
      paymentRef: "MPESAREF9X",
      bookedAt: "08:30",
    },
    {
      id: "RES-006",
      passengerName: "Felix Waweru",
      passengerPhone: "0767 890 123",
      seats: [2, 6],
      seatCount: 2,
      amount: 160,
      route: "58 Buru Buru → CBD",
      departure: "14:00",
      date: "Today",
      status: "confirmed",
      paymentStatus: "paid",
      paymentRef: "MPESA6M4Q1W",
      bookedAt: "13:10",
    },
    {
      id: "RES-007",
      passengerName: "Grace Achieng",
      passengerPhone: "0778 901 234",
      seats: [10],
      seatCount: 1,
      amount: 80,
      route: "58 Buru Buru → CBD",
      departure: "07:30",
      date: "Yesterday",
      status: "boarded",
      paymentStatus: "paid",
      paymentRef: "MPESAPQ83LK",
      bookedAt: "06:55",
    },
    {
      id: "RES-008",
      passengerName: "Hassan Abdi",
      passengerPhone: "0789 012 345",
      seats: [13, 14],
      seatCount: 2,
      amount: 160,
      route: "58 Buru Buru → CBD",
      departure: "07:30",
      date: "Yesterday",
      status: "no_show",
      paymentStatus: "paid",
      paymentRef: "MPESARS72JN",
      bookedAt: "06:40",
    },
    {
      id: "RES-009",
      passengerName: "Irene Wanjiku",
      passengerPhone: "0790 123 456",
      seats: [3, 4, 5],
      seatCount: 3,
      amount: 240,
      route: "58 Buru Buru → CBD",
      departure: "10:00",
      date: "Yesterday",
      status: "boarded",
      paymentStatus: "paid",
      paymentRef: "MPESA8B6VK3",
      bookedAt: "09:30",
    },
  ])

  // ── View state ─────────────────────────────────────────────────────────────
  let filterStatus = $state<ReservationStatus | "all">("all")
  let filterDate = $state("all")
  let filterDeparture = $state("all")
  let selectedId = $state<string | null>(null)
  let markingId = $state<string | null>(null)

  let selectedRes = $derived(
    reservations.find((r) => r.id === selectedId) ?? null,
  )

  let filtered = $derived(
    reservations.filter((r) => {
      const okStatus = filterStatus === "all" || r.status === filterStatus
      const okDate = filterDate === "all" || r.date === filterDate
      const okDeparture =
        filterDeparture === "all" || r.departure === filterDeparture
      return okStatus && okDate && okDeparture
    }),
  )

  // ── Departure slots derived from data ──────────────────────────────────────
  let departureTimes = $derived(
    [
      ...new Set(
        reservations
          .filter((r) => r.date === filterDate || filterDate === "all")
          .map((r) => r.departure),
      ),
    ].sort(),
  )

  // ── KPI counts ────────────────────────────────────────────────────────────
  let todayRes = $derived(reservations.filter((r) => r.date === "Today"))
  let todayConfirmed = $derived(
    todayRes.filter((r) => r.status === "confirmed").length,
  )
  let todayBoarded = $derived(
    todayRes.filter((r) => r.status === "boarded").length,
  )
  let todayPending = $derived(
    todayRes.filter((r) => r.status === "pending").length,
  )
  let todayRevenue = $derived(
    todayRes
      .filter((r) => r.paymentStatus === "paid")
      .reduce((s, r) => s + r.amount, 0),
  )
  let totalSeatsBooked = $derived(todayRes.reduce((s, r) => s + r.seatCount, 0))

  // Seat occupancy map for today's 07:30 trip
  let seatsOccupied = $derived(
    reservations
      .filter(
        (r) =>
          r.date === "Today" &&
          r.departure === "07:30" &&
          r.status !== "cancelled",
      )
      .flatMap((r) => r.seats),
  )

  // ── Quick status update ────────────────────────────────────────────────────
  async function markStatus(id: string, newStatus: ReservationStatus) {
    markingId = id
    await new Promise((r) => setTimeout(r, 600))
    reservations = reservations.map((r) =>
      r.id === id ? { ...r, status: newStatus, isNew: false } : r,
    )
    markingId = null
    if (selectedId === id) selectedId = id // keep panel open, update reactively
  }

  // ── Config ─────────────────────────────────────────────────────────────────
  const STATUS_CFG: Record<
    ReservationStatus,
    { color: string; bg: string; border: string; label: string; icon: string }
  > = {
    confirmed: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.1)",
      border: "rgba(0,176,155,0.22)",
      label: "Confirmed",
      icon: "✓",
    },
    pending: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.22)",
      label: "Pending",
      icon: "…",
    },
    boarded: {
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.1)",
      border: "rgba(167,139,250,0.22)",
      label: "Boarded",
      icon: "↑",
    },
    cancelled: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
      label: "Cancelled",
      icon: "✕",
    },
    no_show: {
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.1)",
      border: "rgba(148,163,184,0.22)",
      label: "No Show",
      icon: "?",
    },
  }
  const PAY_CFG: Record<PaymentStatus, { color: string; label: string }> = {
    paid: { color: "var(--teal)", label: "Paid" },
    pending: { color: "#facc15", label: "Pending" },
    failed: { color: "#f87171", label: "Failed" },
    refunded: { color: "#94a3b8", label: "Refunded" },
  }

  const DATE_FILTERS = ["all", "Today", "Yesterday"]

  // ── Nav ────────────────────────────────────────────────────────────────────
  let openIncidents = $state(1)
  let newTips = $state(3)
  let newRequests = $derived(reservations.filter((r) => r.isNew).length)

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      badge: () => 0,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "requests",
      label: "Requests",
      href: "/requests",
      badge: () => newRequests,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/incidents",
      badge: () => openIncidents,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/tipjar",
      badge: () => newTips,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]
  function isActive(href: string) {
    return href === "/requests"
      ? currentPath.startsWith("/requests")
      : currentPath === href
  }
  function initials(n?: string | null) {
    return !n
      ? "?"
      : n
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
  }
  function nameInitials(n: string) {
    return n
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }
  function randomHue(s: string) {
    let h = 0
    for (let c of s) h = (h * 31 + c.charCodeAt(0)) % 360
    return h
  }

  onMount(() => {
    if (browser) setTimeout(() => (loading = false), 300)
  })
</script>

<svelte:head><title>Requests — Matatu Pulse</title></svelte:head>

<!-- Mobile overlay -->
<div
  class="m-overlay {mobileOpen ? 'open' : ''}"
  onclick={() => (mobileOpen = false)}
>
  <div class="m-panel" onclick={(e) => e.stopPropagation()}>
    <div class="m-head">
      <div class="sb-logo" style="padding:0;border:none">
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
          {#if item.badge()}<span class="nav-badge">{item.badge()}</span>{/if}
        </a>
      {/each}
    </nav>
  </div>
</div>

<div class="shell">
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
          {#if item.badge()}<span class="nav-badge">{item.badge()}</span>{/if}
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
          <a href="/dashboard">Dashboard</a><span class="bc-sep">›</span>
          <span class="bc-cur">Requests</span>
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      {#if loading}
        <div class="loading">
          <span class="spinner"></span>Loading reservations…
        </div>
      {:else}
        <!-- Page header -->
        <div class="page-hd">
          <div class="eyebrow">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              ><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle
                cx="9"
                cy="7"
                r="4"
              /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path
                d="M16 3.13a4 4 0 010 7.75"
              /></svg
            >
            Seat Reservations
          </div>
          <h1 class="page-title">Passenger <em>Requests</em></h1>
          <p class="page-sub">
            Reservations placed on <strong style="color:var(--text-2)"
              >{MY_MATATU.plate}</strong
            > — only bookings for your matatu are shown here.
          </p>
        </div>

        <!-- Matatu identity banner -->
        <div class="matatu-banner">
          <div class="mat-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--orange)"
              stroke-width="2"
              ><rect x="1" y="3" width="15" height="13" /><path
                d="M16 8h4l3 3v5h-7z"
              /><circle cx="5.5" cy="18.5" r="2.5" /><circle
                cx="18.5"
                cy="18.5"
                r="2.5"
              /></svg
            >
          </div>
          <div class="mat-info">
            <div class="mat-plate">{MY_MATATU.plate}</div>
            <div class="mat-route">{MY_MATATU.route}</div>
            <div class="mat-sacco">
              {MY_MATATU.sacco} · Route {MY_MATATU.routeCode}
            </div>
          </div>
          <div class="mat-cap">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle
                cx="9"
                cy="7"
                r="4"
              /></svg
            >
            {MY_MATATU.capacity} seats
          </div>
          <div class="mat-cap">
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
            >
            {new Date().toLocaleDateString("en-KE", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        <!-- KPIs -->
        <div class="kpi-strip">
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle
                  cx="9"
                  cy="7"
                  r="4"
                /></svg
              >Today's Bookings
            </div>
            <div class="kpi-val">{todayRes.length}</div>
            <div class="kpi-meta">{totalSeatsBooked} seats reserved</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:var(--teal)">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg
              >Confirmed
            </div>
            <div class="kpi-val" style="color:var(--teal)">
              {todayConfirmed}
            </div>
            <div class="kpi-meta">Ready to board</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:#a78bfa">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg
              >Boarded
            </div>
            <div class="kpi-val" style="color:#a78bfa">{todayBoarded}</div>
            <div class="kpi-meta">On vehicle</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:#facc15">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><circle cx="12" cy="12" r="10" /></svg
              >Pending
            </div>
            <div class="kpi-val" style="color:#facc15">{todayPending}</div>
            <div class="kpi-meta">Awaiting payment</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:var(--teal)">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><line x1="12" y1="1" x2="12" y2="23" /><path
                  d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                /></svg
              >Revenue
            </div>
            <div class="kpi-val" style="color:var(--teal);font-size:1.3rem">
              KES {todayRevenue.toLocaleString()}
            </div>
            <div class="kpi-meta">Paid today</div>
          </div>
        </div>

        <!-- Seat occupancy mini-map (07:30 trip) -->
        <div class="occupancy-bar">
          <div class="occ-label">07:30 trip seats</div>
          <div class="seat-mini-grid">
            {#each Array.from({ length: MY_MATATU.capacity }, (_, i) => i + 1) as n}
              <div
                class="seat-mini {seatsOccupied.includes(n) ? 'taken' : 'free'}"
                title="Seat {n}"
              >
                {n}
              </div>
            {/each}
          </div>
          <div class="occ-stat">
            <em>{seatsOccupied.length}</em>/{MY_MATATU.capacity} taken
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-row">
          {#each DATE_FILTERS as d}
            <button
              class="filter-chip {filterDate === d ? 'active' : ''}"
              onclick={() => {
                filterDate = d
                filterDeparture = "all"
                selectedId = null
              }}
            >
              {d === "all" ? "All Dates" : d}
            </button>
          {/each}

          {#if departureTimes.length > 0}
            <div
              style="width:1px;height:20px;background:rgba(255,255,255,0.1)"
            ></div>
            {#each departureTimes as dep}
              <button
                class="filter-chip {filterDeparture === dep ? 'active' : ''}"
                onclick={() => {
                  filterDeparture = filterDeparture === dep ? "all" : dep
                  selectedId = null
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  ><circle cx="12" cy="12" r="10" /><polyline
                    points="12 6 12 12 16 14"
                  /></svg
                >
                {dep}
              </button>
            {/each}
          {/if}

          <div class="status-filters">
            {#each ["confirmed", "pending", "boarded", "cancelled", "no_show"] as ReservationStatus[] as st}
              {@const s = STATUS_CFG[st]}
              <button
                class="s-pill {filterStatus === st ? 'act' : ''}"
                style="color:{s.color};background:{s.bg};border-color:{s.border}"
                onclick={() => {
                  filterStatus = filterStatus === st ? "all" : st
                  selectedId = null
                }}>{s.label}</button
              >
            {/each}
          </div>
        </div>

        <!-- List + detail pane -->
        <div class="layout">
          <!-- Reservation list -->
          <div>
            {#if filtered.length === 0}
              <div class="empty">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  ><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle
                    cx="9"
                    cy="7"
                    r="4"
                  /></svg
                >
                <div class="empty-title">No reservations found</div>
                <div class="empty-sub">
                  Try adjusting your date or status filters.
                </div>
              </div>
            {:else}
              <div class="res-list">
                {#each filtered as res}
                  {@const s = STATUS_CFG[res.status]}
                  {@const pay = PAY_CFG[res.paymentStatus]}
                  {@const hue = randomHue(res.passengerName)}
                  <div
                    class="res-card {selectedId === res.id
                      ? 'selected'
                      : ''} status-{res.status}"
                    onclick={() =>
                      (selectedId = selectedId === res.id ? null : res.id)}
                  >
                    <div class="rc-top">
                      <div
                        class="passenger-av"
                        style="background:hsl({hue},45%,30%);border:1px solid hsl({hue},45%,38%)"
                      >
                        {nameInitials(res.passengerName)}
                      </div>
                      <span class="passenger-name">{res.passengerName}</span>
                      {#if res.isNew}<span class="new-dot" title="New"
                        ></span>{/if}
                      <span class="res-id">{res.id}</span>
                      <span
                        class="s-pill act"
                        style="color:{s.color};background:{s.bg};border-color:{s.border}"
                        >{s.label}</span
                      >
                    </div>

                    <div class="rc-meta">
                      <div class="rc-meta-item">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          ><circle cx="12" cy="12" r="10" /><polyline
                            points="12 6 12 12 16 14"
                          /></svg
                        >
                        {res.departure} · {res.date}
                      </div>
                      <div class="rc-meta-item">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          ><path
                            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                          /></svg
                        >
                        {res.passengerPhone}
                      </div>
                      <div class="rc-meta-item" style="color:{pay.color}">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          ><line x1="12" y1="1" x2="12" y2="23" /><path
                            d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                          /></svg
                        >
                        {pay.label}
                      </div>
                      <div class="rc-meta-item">
                        Booked {res.bookedAt}
                      </div>
                    </div>

                    <div class="rc-bottom">
                      <div class="seat-chips">
                        {#each res.seats as seat}
                          <div class="seat-chip">{seat}</div>
                        {/each}
                        <span
                          style="font-size:0.65rem;color:var(--text-3);align-self:center;margin-left:2px"
                          >{res.seatCount} seat{res.seatCount !== 1
                            ? "s"
                            : ""}</span
                        >
                      </div>
                      <div class="rc-amount">
                        KES {res.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Detail panel -->
          {#if selectedRes}
            {@const s = STATUS_CFG[selectedRes.status]}
            {@const pay = PAY_CFG[selectedRes.paymentStatus]}
            {@const hue = randomHue(selectedRes.passengerName)}
            {@const isMarking = markingId === selectedRes.id}
            <div class="detail-panel">
              <div class="dp-header">
                <button class="dp-close" onclick={() => (selectedId = null)}
                  >✕ Close</button
                >
                <div class="dp-pax">
                  <div
                    class="dp-av"
                    style="background:hsl({hue},45%,30%);border:1px solid hsl({hue},45%,38%)"
                  >
                    {nameInitials(selectedRes.passengerName)}
                  </div>
                  <div>
                    <div class="dp-name">{selectedRes.passengerName}</div>
                    <div class="dp-phone">{selectedRes.passengerPhone}</div>
                  </div>
                </div>
                <div class="dp-badges">
                  <span
                    class="s-pill act"
                    style="color:{s.color};background:{s.bg};border-color:{s.border}"
                    >{s.label}</span
                  >
                  <span
                    class="s-pill act"
                    style="color:{pay.color};background:rgba(0,0,0,0.15);border-color:{pay.color}40"
                    >{pay.label}</span
                  >
                </div>
              </div>

              <div class="dp-body">
                <!-- Details grid -->
                <div class="dp-sec">
                  <div class="dp-sec-label">Reservation Details</div>
                  <div class="dp-meta-grid">
                    <div class="dp-meta-item">
                      <div class="dp-mk">ID</div>
                      <div class="dp-mv mono">{selectedRes.id}</div>
                    </div>
                    <div class="dp-meta-item">
                      <div class="dp-mk">Departure</div>
                      <div class="dp-mv">{selectedRes.departure}</div>
                    </div>
                    <div class="dp-meta-item">
                      <div class="dp-mk">Date</div>
                      <div class="dp-mv">{selectedRes.date}</div>
                    </div>
                    <div class="dp-meta-item">
                      <div class="dp-mk">Booked At</div>
                      <div class="dp-mv">{selectedRes.bookedAt}</div>
                    </div>
                    <div class="dp-meta-item">
                      <div class="dp-mk">Seats</div>
                      <div class="dp-mv">{selectedRes.seats.join(", ")}</div>
                    </div>
                    <div class="dp-meta-item">
                      <div class="dp-mk">Amount</div>
                      <div class="dp-mv" style="color:var(--teal)">
                        KES {selectedRes.amount.toLocaleString()}
                      </div>
                    </div>
                    <div class="dp-meta-item" style="grid-column:span 2">
                      <div class="dp-mk">M-Pesa Ref</div>
                      <div class="dp-mv mono">{selectedRes.paymentRef}</div>
                    </div>
                  </div>
                </div>

                <!-- Seat map -->
                <div class="dp-sec">
                  <div class="dp-sec-label">
                    Seat Map — {selectedRes.departure} trip
                  </div>
                  <div class="dp-seat-map">
                    {#each Array.from({ length: MY_MATATU.capacity }, (_, i) => i + 1) as n}
                      {@const isThis = selectedRes.seats.includes(n)}
                      {@const isOther = !isThis && seatsOccupied.includes(n)}
                      <div
                        class="dp-seat {isThis
                          ? 'this-res'
                          : isOther
                            ? 'other-taken'
                            : 'free'}"
                        title={isThis
                          ? "This reservation"
                          : isOther
                            ? "Another booking"
                            : "Free"}
                      >
                        {n}
                      </div>
                    {/each}
                  </div>
                  <div style="display:flex;gap:12px;margin-top:8px">
                    <div
                      style="display:flex;align-items:center;gap:5px;font-size:0.62rem;color:var(--text-3)"
                    >
                      <div
                        style="width:10px;height:10px;border-radius:3px;background:rgba(0,176,155,0.2);border:1px solid rgba(0,176,155,0.45)"
                      ></div>
                      This booking
                    </div>
                    <div
                      style="display:flex;align-items:center;gap:5px;font-size:0.62rem;color:var(--text-3)"
                    >
                      <div
                        style="width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)"
                      ></div>
                      Other booking
                    </div>
                    <div
                      style="display:flex;align-items:center;gap:5px;font-size:0.62rem;color:var(--text-3)"
                    >
                      <div
                        style="width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)"
                      ></div>
                      Free
                    </div>
                  </div>
                </div>

                <!-- Quick actions -->
                {#if selectedRes.status !== "cancelled" && selectedRes.status !== "boarded"}
                  <div class="dp-sec">
                    <div class="dp-sec-label">Update Status</div>
                    <div class="action-row">
                      {#if selectedRes.status !== "boarded"}
                        <button
                          class="act-btn act-board"
                          disabled={isMarking ||
                            selectedRes.paymentStatus !== "paid"}
                          onclick={() => markStatus(selectedRes.id, "boarded")}
                          title={selectedRes.paymentStatus !== "paid"
                            ? "Payment not confirmed"
                            : ""}
                        >
                          {#if isMarking}<span class="act-spinner"></span>
                          {:else}<svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              ><polyline points="9 18 15 12 9 6" /></svg
                            >{/if}
                          Boarded
                        </button>
                      {/if}
                      {#if selectedRes.status === "pending"}
                        <button
                          class="act-btn act-confirm"
                          disabled={isMarking}
                          onclick={() =>
                            markStatus(selectedRes.id, "confirmed")}
                        >
                          {#if isMarking}<span class="act-spinner"></span>
                          {:else}<svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              ><polyline points="20 6 9 17 4 12" /></svg
                            >{/if}
                          Confirm
                        </button>
                      {/if}
                      <button
                        class="act-btn act-noshow"
                        disabled={isMarking}
                        onclick={() => markStatus(selectedRes.id, "no_show")}
                      >
                        {#if isMarking}<span class="act-spinner"></span>
                        {:else}<svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            ><circle cx="12" cy="12" r="10" /><line
                              x1="8"
                              y1="12"
                              x2="16"
                              y2="12"
                            /></svg
                          >{/if}
                        No Show
                      </button>
                      <button
                        class="act-btn act-cancel"
                        disabled={isMarking}
                        onclick={() => markStatus(selectedRes.id, "cancelled")}
                      >
                        {#if isMarking}<span class="act-spinner"></span>
                        {:else}<svg
                            width="11"
                            height="11"
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
                          >{/if}
                        Cancel
                      </button>
                    </div>
                    {#if selectedRes.status !== "boarded" && selectedRes.paymentStatus !== "paid"}
                      <p
                        style="font-size:0.66rem;color:#facc15;margin-top:6px;display:flex;align-items:center;gap:5px"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          ><path
                            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                          /></svg
                        >
                        "Boarded" is disabled — payment not yet confirmed.
                      </p>
                    {/if}
                  </div>
                {/if}

                {#if selectedRes.status === "boarded"}
                  <div
                    style="background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.18);border-radius:10px;padding:10px 13px;font-size:0.76rem;color:#a78bfa;display:flex;align-items:center;gap:8px"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg
                    >
                    Passenger has boarded. No further action needed.
                  </div>
                {/if}
                {#if selectedRes.status === "cancelled"}
                  <div
                    style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.18);border-radius:10px;padding:10px 13px;font-size:0.76rem;color:#f87171;display:flex;align-items:center;gap:8px"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                    Reservation cancelled. Refund processed if payment was made.
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Shell / Sidebar ── */
  .shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }
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

  /* ── Page header ── */
  .page-hd {
    margin-bottom: 24px;
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

  /* ── Matatu identity banner ── */
  .matatu-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: rgba(242, 101, 34, 0.06);
    border: 1px solid rgba(242, 101, 34, 0.18);
    border-radius: 14px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .mat-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .mat-info {
    flex: 1;
    min-width: 0;
  }
  .mat-plate {
    font-size: 0.72rem;
    font-weight: 800;
    font-family: monospace;
    color: var(--orange);
    letter-spacing: 0.04em;
  }
  .mat-route {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .mat-sacco {
    font-size: 0.66rem;
    color: var(--text-3);
    margin-top: 1px;
  }
  .mat-cap {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 4px 10px;
    border-radius: 8px;
    white-space: nowrap;
  }

  /* ── KPI strip ── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 14px 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
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
    left: 10px;
    right: 10px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }
  .kpi:hover {
    border-color: rgba(255, 255, 255, 0.12);
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
    gap: 5px;
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

  /* ── Seat occupancy mini-map ── */
  .occupancy-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .occ-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
  }
  .seat-mini-grid {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex: 1;
  }
  .seat-mini {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.52rem;
    font-weight: 800;
    transition: all 0.15s;
    border: 1px solid;
  }
  .seat-mini.taken {
    background: rgba(0, 176, 155, 0.18);
    border-color: rgba(0, 176, 155, 0.35);
    color: var(--teal);
  }
  .seat-mini.free {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.09);
    color: var(--text-3);
  }
  .occ-stat {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-2);
    white-space: nowrap;
  }
  .occ-stat em {
    color: var(--teal);
    font-style: normal;
  }

  /* ── Filters ── */
  .filters-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .filter-chip:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-2);
  }
  .filter-chip.active {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .status-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .s-pill {
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid transparent;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .s-pill:not(.act) {
    opacity: 0.38;
  }
  .s-pill.act {
    opacity: 1;
  }

  /* ── Two-pane layout ── */
  .layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 14px;
    align-items: start;
  }

  /* ── Reservation cards ── */
  .res-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .res-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 15px 18px 13px 22px;
    cursor: pointer;
    position: relative;
    transition:
      background 0.15s,
      border-color 0.15s,
      transform 0.15s;
  }
  .res-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(255, 255, 255, 0.08);
    transition: background 0.15s;
  }
  .res-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.13);
    transform: translateX(2px);
  }
  .res-card.selected {
    border-color: rgba(0, 176, 155, 0.28);
    background: rgba(0, 176, 155, 0.04);
  }
  .res-card.selected::before {
    background: var(--teal);
  }
  .res-card.status-pending::before {
    background: #facc15;
  }
  .res-card.status-boarded::before {
    background: #a78bfa;
  }
  .res-card.status-cancelled::before {
    background: #f87171;
  }
  .res-card.status-no_show::before {
    background: #94a3b8;
  }
  .res-card.selected.status-pending::before {
    background: #facc15;
  }

  .rc-top {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 9px;
    flex-wrap: wrap;
  }
  .passenger-av {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 800;
    color: #fff;
  }
  .passenger-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
    flex: 1;
    min-width: 0;
  }
  .new-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
    flex-shrink: 0;
    animation: blink 1.5s infinite;
  }
  .res-id {
    font-size: 0.6rem;
    font-weight: 700;
    font-family: monospace;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 5px;
    white-space: nowrap;
  }

  .rc-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 9px;
  }
  .rc-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    color: var(--text-3);
  }
  .rc-meta-item :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }

  .rc-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .seat-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .seat-chip {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 800;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .rc-amount {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-1);
  }

  .empty {
    text-align: center;
    padding: 52px 20px;
    color: var(--text-3);
  }
  .empty svg {
    opacity: 0.15;
    margin-bottom: 12px;
  }
  .empty-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-2);
    margin-bottom: 5px;
  }
  .empty-sub {
    font-size: 0.8rem;
  }

  /* ── Detail panel ── */
  .detail-panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 18px;
    overflow: hidden;
    position: sticky;
    top: 68px;
  }
  .dp-header {
    padding: 16px 18px 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  .dp-close {
    float: right;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 7px;
    padding: 3px 9px;
    font-size: 0.68rem;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-body);
  }
  .dp-close:hover {
    background: rgba(255, 255, 255, 0.09);
    color: var(--text-1);
  }
  .dp-pax {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 9px;
  }
  .dp-av {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 800;
    color: #fff;
  }
  .dp-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .dp-phone {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .dp-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .dp-body {
    padding: 14px 18px;
  }
  .dp-sec {
    margin-bottom: 16px;
  }
  .dp-sec-label {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .dp-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .dp-meta-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .dp-mk {
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 2px;
  }
  .dp-mv {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .dp-mv.mono {
    font-family: monospace;
    font-size: 0.72rem;
  }

  /* Seat map in detail panel */
  .dp-seat-map {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  }
  .dp-seat {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.64rem;
    font-weight: 800;
    border: 1px solid;
    transition: all 0.15s;
  }
  .dp-seat.this-res {
    background: rgba(0, 176, 155, 0.2);
    border-color: rgba(0, 176, 155, 0.45);
    color: var(--teal);
  }
  .dp-seat.other-taken {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.25);
  }
  .dp-seat.free {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.15);
  }

  /* Quick action buttons */
  .action-row {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }
  .act-btn {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 9px;
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .act-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .act-board {
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.25);
    color: #a78bfa;
  }
  .act-board:hover:not(:disabled) {
    background: rgba(167, 139, 250, 0.18);
  }
  .act-noshow {
    background: rgba(148, 163, 184, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #94a3b8;
  }
  .act-noshow:hover:not(:disabled) {
    background: rgba(148, 163, 184, 0.14);
  }
  .act-confirm {
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .act-confirm:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.18);
  }
  .act-cancel {
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    color: #f87171;
  }
  .act-cancel:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.14);
  }

  .act-spinner {
    width: 11px;
    height: 11px;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Loading ── */
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

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .detail-panel {
      position: static;
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
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 640px) {
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .filters-row {
      flex-direction: column;
      align-items: flex-start;
    }
    .status-filters {
      margin-left: 0;
    }
  }
</style>
