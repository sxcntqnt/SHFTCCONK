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
  interface Tip {
    id: string
    from: string
    amount: number
    note?: string
    time: string
    date: string
    route: string
    isNew?: boolean
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const tips: Tip[] = [
    {
      id: "TIP-001",
      from: "Passenger #4471",
      amount: 50,
      note: "Great service! Very smooth ride.",
      time: "11:30",
      date: "Today",
      route: "58 Buru → CBD",
      isNew: true,
    },
    {
      id: "TIP-002",
      from: "Passenger #2190",
      amount: 100,
      note: "Always on time, thanks!",
      time: "09:05",
      date: "Today",
      route: "58 Buru → CBD",
      isNew: true,
    },
    {
      id: "TIP-003",
      from: "Passenger #8820",
      amount: 30,
      time: "08:47",
      date: "Today",
      route: "58 Buru → CBD",
      isNew: true,
    },
    {
      id: "TIP-004",
      from: "Passenger #1155",
      amount: 200,
      note: "Helped with my luggage, legend!",
      time: "17:22",
      date: "Yesterday",
      route: "23 Ngong Rd → CBD",
    },
    {
      id: "TIP-005",
      from: "Passenger #3380",
      amount: 50,
      time: "14:10",
      date: "Yesterday",
      route: "23 Ngong Rd → CBD",
    },
    {
      id: "TIP-006",
      from: "Passenger #7744",
      amount: 20,
      note: "Safe driving, thank you",
      time: "12:35",
      date: "Yesterday",
      route: "46 Rongai → CBD",
    },
    {
      id: "TIP-007",
      from: "Passenger #5501",
      amount: 150,
      note: "Best conductor on this route",
      time: "08:00",
      date: "Mon",
      route: "12 Eastleigh → City Hall",
    },
    {
      id: "TIP-008",
      from: "Passenger #6620",
      amount: 50,
      time: "16:55",
      date: "Mon",
      route: "46 Rongai → CBD",
    },
    {
      id: "TIP-009",
      from: "Passenger #9912",
      amount: 100,
      note: "Helped elderly passenger — kind",
      time: "10:20",
      date: "Sun",
      route: "58 Buru → CBD",
    },
  ]

  const totalWithdrawn = 1300

  // ── Computed ───────────────────────────────────────────────────────────────
  let filterDate = $state("all")
  const DATE_FILTERS = ["all", "Today", "Yesterday", "Mon", "Sun"]
  let filtered = $derived(
    tips.filter((t) => filterDate === "all" || t.date === filterDate),
  )

  let totalReceived = tips.reduce((s, t) => s + t.amount, 0)
  let todayTotal = tips
    .filter((t) => t.date === "Today")
    .reduce((s, t) => s + t.amount, 0)
  let newCount = tips.filter((t) => t.isNew).length
  let availableBalance = totalReceived - totalWithdrawn
  let avgTip = Math.round(totalReceived / tips.length)
  let weeklyTotal = tips.reduce((s, t) => s + t.amount, 0) // all are within 7 days in demo
  let topTippers = [...tips].sort((a, b) => b.amount - a.amount).slice(0, 5)

  function randomHue(str: string) {
    let h = 0
    for (let c of str) h = (h * 31 + c.charCodeAt(0)) % 360
    return h
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  let openIncidents = $state(1)
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/crew/dashboard",
      badge: () => 0,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/crew/incidents",
      badge: () => openIncidents,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/crew/tipjar",
      badge: () => newCount,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]
  function isActive(href: string) {
    return href === "/tipjar"
      ? currentPath.startsWith("/tipjar")
      : currentPath === href
  }
  function initials(name?: string | null) {
    return !name
      ? "?"
      : name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
  }

  onMount(() => {
    if (browser) setTimeout(() => (loading = false), 300)
  })
</script>

<svelte:head><title>Tip Jar — Matatu Pulse</title></svelte:head>

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
      <a href="/account/sign_out" class="sign-out"
        ><svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >Sign Out</a
      >
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="tb-left">
        <button class="hamburger" onclick={() => (mobileOpen = true)}
          ><svg
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
          ></button
        >
        <nav class="breadcrumb">
          <a href="/crew/dashboard">Dashboard</a><span class="bc-sep">›</span
          ><span class="bc-cur">Tip Jar</span>
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      {#if loading}
        <div class="loading"><span class="spinner"></span>Loading tip jar…</div>
      {:else}
        <div class="page-hd">
          <div>
            <div class="eyebrow">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                ><path
                  d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                /></svg
              >Tip Jar
            </div>
            <h1 class="page-title">Your <em>Tips</em></h1>
            <p class="page-sub">
              Tips from happy passengers. Withdraw to M-Pesa anytime.
            </p>
          </div>
          <a href="/tipjar/withdraw" class="withdraw-cta">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                points="19 12 12 19 5 12"
              /></svg
            >
            Withdraw Funds
          </a>
        </div>

        <!-- Balance hero -->
        <div class="balance-hero">
          <div>
            <div class="bal-label">Available Balance</div>
            <div class="bal-amount">
              <span class="bal-cur">KES</span>
              <span class="bal-val">{availableBalance.toLocaleString()}</span>
            </div>
            {#if newCount > 0}
              <div class="bal-new">
                <span class="bal-new-dot"></span>{newCount} new tip{newCount !==
                1
                  ? "s"
                  : ""} today · +KES {todayTotal.toLocaleString()}
              </div>
            {/if}
          </div>
          <div class="bal-stats">
            <div class="bal-stat">
              <div class="bst-val">KES {totalReceived.toLocaleString()}</div>
              <div class="bst-lbl">Total Received</div>
            </div>
            <div class="bst-div"></div>
            <div class="bal-stat">
              <div class="bst-val">KES {totalWithdrawn.toLocaleString()}</div>
              <div class="bst-lbl">Withdrawn</div>
            </div>
            <div class="bst-div"></div>
            <div class="bal-stat">
              <div class="bst-val">{tips.length}</div>
              <div class="bst-lbl">Total Tips</div>
            </div>
          </div>
        </div>

        <!-- KPIs -->
        <div class="kpi-strip">
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path
                  d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                /></svg
              >Today
            </div>
            <div class="kpi-val" style="color:var(--teal)">
              KES {todayTotal}
            </div>
            <div class="kpi-meta">
              {tips.filter((t) => t.date === "Today").length} tips
            </div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline
                  points="17 6 23 6 23 12"
                /></svg
              >Average
            </div>
            <div class="kpi-val">KES {avgTip}</div>
            <div class="kpi-meta">Per passenger</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
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
              >This Week
            </div>
            <div class="kpi-val">KES {weeklyTotal.toLocaleString()}</div>
            <div class="kpi-meta">Last 7 days</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl">
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
              >Withdrawn
            </div>
            <div class="kpi-val">KES {totalWithdrawn.toLocaleString()}</div>
            <div class="kpi-meta">All time</div>
          </div>
        </div>

        <!-- Tips + sidebar -->
        <div class="two-col">
          <!-- Tips list -->
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Passenger Tips</div>
                <div class="card-ti">Tip History</div>
              </div>
              <a
                href="/tipjar/withdraw"
                style="display:inline-flex;align-items:center;gap:5px;font-size:0.7rem;font-weight:700;color:var(--teal);text-decoration:none;opacity:0.8;transition:opacity 0.15s"
                onmouseenter={(e) =>
                  ((e.currentTarget as HTMLElement).style.opacity = "1")}
                onmouseleave={(e) =>
                  ((e.currentTarget as HTMLElement).style.opacity = "0.8")}
              >
                Withdraw →
              </a>
            </div>
            <div class="date-filters">
              {#each DATE_FILTERS as d}
                <button
                  class="date-chip {filterDate === d ? 'active' : ''}"
                  onclick={() => (filterDate = d)}
                  >{d === "all" ? "All Time" : d}</button
                >
              {/each}
            </div>
            {#if filtered.length === 0}
              <div class="empty">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  ><path
                    d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                  /></svg
                >
                <div class="empty-title">No tips for this period</div>
                <div class="empty-sub">Keep up the great service!</div>
              </div>
            {:else}
              <div class="tip-list">
                {#each filtered as tip, i}
                  {#if i === 0 || filtered[i - 1].date !== tip.date}<div
                      class="date-sep"
                    >
                      {tip.date}
                    </div>{/if}
                  {@const hue = randomHue(tip.from)}
                  <div class="tip-row {tip.isNew ? 'tip-new' : ''}">
                    <div
                      class="tip-av"
                      style="background:hsl({hue},45%,28%);border:1px solid hsl({hue},45%,35%)"
                    >
                      {tip.from.slice(-2)}
                    </div>
                    <div class="tip-info">
                      <div class="tip-from">
                        {tip.from}{#if tip.isNew}<span class="tip-new-dot"
                          ></span>{/if}
                      </div>
                      <div class="tip-meta">{tip.route}</div>
                      {#if tip.note}<div class="tip-note">
                          "{tip.note}"
                        </div>{/if}
                    </div>
                    <div class="tip-right">
                      <div class="tip-amount">+KES {tip.amount}</div>
                      <div class="tip-time">{tip.time}</div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Sidebar -->
          <div class="side-col">
            <!-- Top tippers -->
            <div class="side-card">
              <div class="side-hd">
                <div class="side-ey">Generosity</div>
                <div class="side-ti">Top Tippers</div>
              </div>
              <div class="side-body">
                <div class="leaderboard">
                  {#each topTippers as tip, i}
                    {@const hue = randomHue(tip.from)}
                    <div class="lb-row">
                      <div
                        class="lb-rank"
                        style="color:{i === 0
                          ? '#facc15'
                          : i === 1
                            ? 'rgba(255,255,255,0.4)'
                            : i === 2
                              ? '#fb923c'
                              : 'var(--text-3)'}"
                      >
                        #{i + 1}
                      </div>
                      <div
                        class="lb-av"
                        style="background:hsl({hue},45%,28%);border:1px solid hsl({hue},45%,35%)"
                      >
                        {tip.from.slice(-2)}
                      </div>
                      <div class="lb-info">
                        <div class="lb-name">{tip.from}</div>
                        <div class="lb-route">
                          {tip.route.split("→")[0].trim()}
                        </div>
                      </div>
                      <div class="lb-amt">KES {tip.amount}</div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Quick withdraw prompt -->
            <div class="side-card">
              <div class="side-hd">
                <div class="side-ey">M-Pesa</div>
                <div class="side-ti">Withdraw</div>
              </div>
              <div class="side-body">
                <div
                  style="padding:12px;background:rgba(0,176,155,0.06);border:1px solid rgba(0,176,155,0.15);border-radius:11px;margin-bottom:12px"
                >
                  <div
                    style="font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--teal);margin-bottom:3px"
                  >
                    Available
                  </div>
                  <div
                    style="font-family:var(--font-display);font-size:1.8rem;font-weight:900;letter-spacing:-0.05em;color:var(--text-1);line-height:1"
                  >
                    KES {availableBalance.toLocaleString()}
                  </div>
                </div>
                <a
                  href="/tipjar/withdraw"
                  style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;border-radius:11px;background:var(--teal);font-family:var(--font-body);font-size:0.82rem;font-weight:700;color:#fff;text-decoration:none;transition:background 0.15s;box-shadow:0 3px 14px rgba(0,176,155,0.26)"
                  onmouseenter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "#009a88")}
                  onmouseleave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--teal)")}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                      points="19 12 12 19 5 12"
                    /></svg
                  >
                  Go to Withdraw
                </a>
              </div>
            </div>
          </div>
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

  /* ── Page ── */
  .page-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 14px;
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
  .withdraw-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 22px;
    background: var(--teal);
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s,
      transform 0.15s,
      box-shadow 0.15s;
    box-shadow: 0 4px 20px rgba(0, 176, 155, 0.3);
  }
  .withdraw-cta:hover {
    background: #009a88;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(0, 176, 155, 0.38);
  }

  /* ── Hero balance ── */
  .balance-hero {
    background: linear-gradient(
      145deg,
      rgba(0, 176, 155, 0.12),
      rgba(0, 176, 155, 0.03) 60%
    );
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 20px;
    padding: 28px 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
  .balance-hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 176, 155, 0.4),
      transparent
    );
  }
  .balance-hero::after {
    content: "";
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.08),
      transparent 65%
    );
    pointer-events: none;
  }
  .bal-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--teal);
    opacity: 0.8;
    margin-bottom: 6px;
  }
  .bal-amount {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .bal-cur {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--teal);
  }
  .bal-val {
    font-family: var(--font-display);
    font-size: 3.2rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text-1);
  }
  .bal-new {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 8px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    padding: 3px 9px;
    border-radius: 100px;
  }
  .bal-new-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: blink 1.5s infinite;
  }
  .bal-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .bal-stat {
    text-align: right;
  }
  .bst-val {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1;
  }
  .bst-lbl {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-top: 3px;
  }
  .bst-div {
    width: 1px;
    background: rgba(255, 255, 255, 0.08);
    align-self: stretch;
  }

  /* ── KPIs ── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
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
    border-color: rgba(255, 255, 255, 0.12);
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
    font-size: 1.8rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--text-1);
  }
  .kpi-meta {
    font-size: 0.65rem;
    color: var(--text-3);
  }

  /* ── Two-col layout ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 16px;
    align-items: start;
  }

  /* ── Tip history card ── */
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
    padding: 16px 20px 12px;
    flex-wrap: wrap;
    gap: 8px;
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

  .date-filters {
    display: flex;
    gap: 7px;
    padding: 0 20px 12px;
    flex-wrap: wrap;
  }
  .date-chip {
    padding: 4px 11px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .date-chip:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-2);
  }
  .date-chip.active {
    background: rgba(0, 176, 155, 0.09);
    border-color: rgba(0, 176, 155, 0.22);
    color: var(--teal);
  }

  .tip-list {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .date-sep {
    padding: 10px 10px 5px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .tip-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 10px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.14s;
  }
  .tip-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .tip-row.tip-new {
    border-color: rgba(0, 176, 155, 0.14);
    background: rgba(0, 176, 155, 0.04);
  }
  .tip-av {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 800;
    color: #fff;
  }
  .tip-info {
    flex: 1;
    min-width: 0;
  }
  .tip-from {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tip-new-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    flex-shrink: 0;
  }
  .tip-meta {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .tip-note {
    font-size: 0.7rem;
    color: var(--text-3);
    margin-top: 3px;
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tip-right {
    text-align: right;
    flex-shrink: 0;
  }
  .tip-amount {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--teal);
  }
  .tip-time {
    font-size: 0.6rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .empty {
    text-align: center;
    padding: 36px 20px;
    color: var(--text-3);
  }
  .empty svg {
    opacity: 0.15;
    margin-bottom: 10px;
  }
  .empty-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-2);
    margin-bottom: 4px;
  }
  .empty-sub {
    font-size: 0.75rem;
  }

  /* ── Sidebar ── */
  .side-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: 68px;
  }
  .side-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    overflow: hidden;
  }
  .side-card::before {
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
  .side-hd {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .side-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .side-ti {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .side-body {
    padding: 12px 14px;
  }

  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .lb-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 8px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.02);
  }
  .lb-rank {
    width: 18px;
    text-align: center;
    font-size: 0.64rem;
    font-weight: 800;
    flex-shrink: 0;
  }
  .lb-av {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58rem;
    font-weight: 800;
    color: #fff;
  }
  .lb-info {
    flex: 1;
    min-width: 0;
  }
  .lb-name {
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .lb-route {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  .lb-amt {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--teal);
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

  @media (max-width: 1100px) {
    .two-col {
      grid-template-columns: 1fr;
    }
    .side-col {
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
  @media (max-width: 760px) {
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
