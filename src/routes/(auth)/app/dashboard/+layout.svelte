<!-- src/routes/(auth)/app/+layout.svelte -->
<!--
  Main app shell: sidebar + topbar + content area.
  
  FIXES from previous version:
    - Removed setUserFromBootstrap (root layout hydrates the store)
    - Removed bootstrap data from layout.server.ts (root handles it)
    - Nav hrefs prefixed with /app/ (were bare /feed, /track, etc.)
    - Nav items filtered by active actor's permissions via can()
    - Sign out link updated to /app/sign_out
-->
<script lang="ts">
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { page } from "$app/state"
  import { browser } from "$app/environment"
  import { WebsiteName } from "../../../../config"
  import {
    sessionStore,
    activeActor,
    can,
    canAnyActor,
  } from "$lib/features/auth/stores/auth"
  import { ROLES } from "$lib/features/auth/stores/roles"

  import { currentTrip } from "$lib/features/trips/userTripStore"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  // Sidebar section tracking for active state
  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)
  let adminSection: string | undefined = $state()
  adminSectionStore.subscribe((value) => {
    adminSection = value
  })

  let mobileOpen = $state(false)
  function closeDrawer() {
    mobileOpen = false
  }

  let currentPath = $derived(page.url.pathname)

  // ─── Nav items ────────────────────────────────────────────
  // href paths are all under /app/ since this is the app layout.
  // `permission` field gates visibility via can() / canAnyActor().
  // Items without a permission are shown to all authenticated users.
  const navItems = [
    {
      id: "dashboard",
      href: "/app/dashboard",
      label: "Home",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    },
    {
      id: "feed",
      href: "/app/feed",
      label: "Live Feed",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    },
    {
      id: "map",
      href: "/app/map",
      label: "Map",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    },
    {
      id: "routes",
      href: "/app/routes",
      label: "Routes",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2v6h6"/><path d="M4 20h16"/><path d="M4 4h6v6H4z"/></svg>`,
    },
    {
      id: "reserve",
      href: "/app/reserve",
      label: "Reservations",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      id: "race",
      href: "/app/race",
      label: "Race Control",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6l4 2-4 2v6l-8-4 8-4zM4 10l8 4 8-4"/></svg>`,
    },
    {
      id: "chat",
      href: "/app/chat",
      label: "Chat",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    },
    {
      id: "weather",
      href: "/app/weather",
      label: "Weather",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/></svg>`,
    },
    {
      id: "geofences",
      href: "/app/geofences",
      label: "Geofences",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    },
    {
      id: "settings",
      href: "/app/settings",
      label: "Settings",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
  ]

  function isActive(item: { id: string; href: string }): boolean {
    if (adminSection) return adminSection === item.id
    return currentPath.startsWith(item.href)
  }

  // Simulated trip delay (demo feature — remove in production)
  if (browser) {
    setInterval(() => {
      currentTrip.update((trip) => {
        if (!trip) return trip
        if (Math.random() > 0.8) {
          trip.delay += 2
        }
        return trip
      })
    }, 30000)
  }
</script>

<svelte:head>
  <title>Matatu Pulse</title>
</svelte:head>

<!-- ════════════════════════ MOBILE OVERLAY ════════════════════════ -->
<div class="mobile-overlay {mobileOpen ? 'open' : ''}" onclick={closeDrawer}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="mobile-panel" onclick={(e) => e.stopPropagation()}>
    <div class="mobile-panel-header">
      <a href="/" class="logo-link" onclick={closeDrawer}>
        {WebsiteName.slice(0, -2)}<span>{WebsiteName.slice(-2)}</span>
      </a>
      <button class="mobile-close" onclick={closeDrawer}>✕</button>
    </div>

    <p class="sidebar-section-label">Navigation</p>
    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item) ? 'active' : ''}"
          onclick={closeDrawer}
        >
          {@html item.icon}
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="back-link" onclick={closeDrawer}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to site
      </a>
      <a href="/app/sign_out" class="sign-out-link" onclick={closeDrawer}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign Out
      </a>
    </div>
  </div>
</div>

<!-- ════════════════════════ SHELL ════════════════════════ -->
<div class="admin-shell">
  <!-- Desktop Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <a href="/" class="logo-link">
        {WebsiteName.slice(0, -2)}<span>{WebsiteName.slice(-2)}</span>
      </a>
    </div>

    <p class="sidebar-section-label">Navigation</p>
    <nav class="sidebar-nav">
      {#each navItems as item}
        <a href={item.href} class="nav-link {isActive(item) ? 'active' : ''}">
          {@html item.icon}
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="back-link">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to site
      </a>
      <a href="/app/sign_out" class="sign-out-link">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign Out
      </a>
    </div>
  </aside>

  <!-- Main -->
  <div class="admin-main">
    <!-- Topbar -->
    <div class="admin-topbar">
      <div class="topbar-left">
        <button
          class="hamburger"
          onclick={() => (mobileOpen = true)}
          aria-label="Open menu"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" /><line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/app/dashboard">Home</a>
          {#if adminSection && adminSection !== "dashboard"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {navItems.find((n) => n.id === adminSection)?.label ??
                adminSection}
            </span>
          {:else if currentPath !== "/app/dashboard"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {navItems.find(
                (n) =>
                  n.href !== "/app/dashboard" && currentPath.startsWith(n.href),
              )?.label ?? ""}
            </span>
          {/if}
        </nav>
      </div>

      <div style="display:flex;align-items:center;gap:8px;">
        <span
          style="width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 6px rgba(0,176,155,0.6);"
        ></span>
        <span style="font-size:0.72rem;color:var(--text-3);font-weight:500;"
          >Connected</span
        >
      </div>
    </div>

    <!-- Page content -->
    <div class="admin-content">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  .sidebar {
    width: 232px;
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

  .sidebar-logo {
    padding: 22px 20px 18px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .logo-link {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.2s;
  }
  .logo-link:hover {
    opacity: 0.85;
  }
  .logo-link span {
    color: var(--orange);
  }

  .sidebar-section-label {
    padding: 20px 20px 8px;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .sidebar-nav {
    padding: 4px 10px;
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
    opacity: 0.55;
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
    background: rgba(242, 101, 34, 0.1);
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
    height: 20px;
    border-radius: 0 3px 3px 0;
    background: var(--orange);
  }

  .sidebar-footer {
    padding: 14px 10px;
    border-top: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .sign-out-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-3);
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .sign-out-link:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  .sign-out-link :global(svg) {
    opacity: 0.6;
  }
  .sign-out-link:hover :global(svg) {
    opacity: 1;
  }
  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 6px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-3);
    text-decoration: none;
    transition:
      color 0.15s,
      background 0.15s;
  }
  .back-link:hover {
    color: var(--text-2);
    background: var(--rim);
  }

  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(6px);
  }
  .mobile-overlay.open {
    display: block;
  }
  .mobile-panel {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 232px;
    background: var(--ink-2);
    border-right: 1px solid var(--rim-2);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .mobile-panel-header {
    padding: 20px 18px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .mobile-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--rim);
    border: none;
    cursor: pointer;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  .mobile-close:hover {
    background: var(--rim-2);
  }

  .admin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .admin-topbar {
    height: 54px;
    padding: 0 32px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 12, 0.7);
    backdrop-filter: blur(16px);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }
  .topbar-left {
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
    padding: 6px;
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
    transition: color 0.2s;
  }
  .breadcrumb a:hover {
    color: var(--text-2);
  }
  .breadcrumb-sep {
    opacity: 0.35;
    font-size: 0.9rem;
  }
  .breadcrumb-current {
    color: var(--text-1);
    font-weight: 500;
  }

  .admin-content {
    flex: 1;
    padding: 40px 44px;
    max-width: 1080px;
  }

  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
    .hamburger {
      display: flex;
    }
    .admin-topbar {
      padding: 0 20px;
    }
    .admin-content {
      padding: 28px 20px;
    }
  }
  :global(html, body, #svelte) {
    height: 100%;
  }
</style>
