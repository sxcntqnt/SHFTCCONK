<!-- src/routes/(auth)/app/+layout.svelte -->
<script lang="ts">
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { page } from "$app/state"
  import { browser } from "$app/environment"
  import { WebsiteName } from "../../../config"
  import {
    sessionStore,
    activeActor,
    canAnyActor,
  } from "$lib/features/auth/stores/auth"
  import { ROLES } from "$lib/features/auth/stores/roles"
  import { currentTrip } from "$lib/features/trips/userTripStore"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  // Sidebar section tracking
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

  // ─── Collapsible sidebar ───
  let collapsed = $state(false)

  // Persist preference
  $effect(() => {
    if (browser) {
      const saved = localStorage.getItem("sidebar_collapsed")
      if (saved === "true") collapsed = true
    }
  })

  function toggleCollapse() {
    collapsed = !collapsed
    if (browser) localStorage.setItem("sidebar_collapsed", String(collapsed))
  }

  let currentPath = $derived(page.url.pathname)

  // ─── Session-derived data ───
  let session = $derived($sessionStore)
  let profile = $derived(session?.profile ?? null)
  let actors = $derived(
    session?.actors?.filter((a: any) => a.status === "active") ?? [],
  )
  let currentActor = $derived($activeActor)
  let actorType = $derived(currentActor?.type ?? actors[0]?.type ?? null)

  // Avatar helpers
  function avatarUrl(): string | null {
    return profile?.avatar_url ?? null
  }

  function displayName(): string {
    return profile?.full_name || "User"
  }

  function initials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  function actorLabel(type: string | null): string {
    if (!type) return "User"
    const labels: Record<string, string> = {
      driver: "Driver",
      conductor: "Conductor",
      passenger: "Passenger",
      fleet_owner: "Fleet Owner",
      stage_operator: "Stage Operator",
      organization: "Organization",
      admin: "Admin",
      regulator: "Regulator",
      planner: "Planner",
    }
    return (
      labels[type] ||
      type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
  }

  function actorColorClass(type: string | null): string {
    if (!type) return "actor-default"
    const map: Record<string, string> = {
      driver: "actor-driver",
      conductor: "actor-conductor",
      passenger: "actor-passenger",
      fleet_owner: "actor-fleet",
      stage_operator: "actor-operator",
      organization: "actor-org",
      admin: "actor-admin",
      regulator: "actor-regulator",
    }
    return map[type] || "actor-default"
  }

  // ─── Permission-gated nav items ───
  const allNavItems = [
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
      permission: "map.view",
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
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-icon lucide-book-open"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
    },
    {
      id: "race",
      href: "/app/race",
      label: "Race Control",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6l4 2-4 2v6l-8-4 8-4zM4 10l8 4 8-4"/></svg>`,
    },
    {
      id: "calender",
      href: "/app/calender",
      label: "Calendar",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`,
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
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    },
    {
      id: "track",
      href: "/app/track",
      label: "Track",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
      permission: "track.view",
    },
    {
      id: "subscribe",
      href: "/app/subscribe",
      label: "Subscribe",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-spotlight-icon lucide-spotlight"><path d="M15.295 19.562 16 22"/><path d="m17 16 3.758 2.098"/><path d="m19 12.5 3.026-.598"/><path d="M7.61 6.3a3 3 0 0 0-3.92 1.3l-1.38 2.79a3 3 0 0 0 1.3 3.91l6.89 3.597a1 1 0 0 0 1.342-.447l3.106-6.211a1 1 0 0 0-.447-1.341z"/><path d="M8 9V2"/></svg>`,
    },
    {
      id: "settings",
      href: "/app/settings",
      label: "Settings",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15 1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
  ]

  // Filter nav items by permission
  let navItems = $derived(
    allNavItems.filter((item) => {
      if (!item.permission) return true
      // Check if any actor can perform this action
      try {
        return canAnyActor(item.permission)
      } catch {
        return true
      }
    }),
  )

  function isActive(item: { id: string; href: string }): boolean {
    if (adminSection) return adminSection === item.id
    return currentPath.startsWith(item.href)
  }

  // Trip delay simulation
  if (browser) {
    setInterval(() => {
      currentTrip.update((trip) => {
        if (!trip) return trip
        if (Math.random() > 0.8) trip.delay += 2
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
        {WebsiteName.slice(0, -2)}<span class="logo-accent"
          >{WebsiteName.slice(-2)}</span
        >
      </a>
      <button class="mobile-close" onclick={closeDrawer}>
        <svg
          width="14"
          height="14"
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

    <p class="sidebar-section-label">Navigation</p>
    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item) ? 'active' : ''}"
          onclick={closeDrawer}
        >
          {@html item.icon}
          <span class="nav-label">{item.label}</span>
        </a>
      {/each}
    </nav>

    <!-- Mobile profile -->
    <div class="sidebar-profile">
      <a href="/app/settings" class="profile-link" onclick={closeDrawer}>
        {#if avatarUrl()}
          <img src={avatarUrl()} alt="" class="profile-avatar" />
        {:else}
          <div class="profile-avatar-placeholder">
            {initials(displayName())}
          </div>
        {/if}
        <div class="profile-info">
          <span class="profile-name">{displayName()}</span>
          <span class="profile-actor {actorColorClass(actorType)}"
            >{actorLabel(actorType)}</span
          >
        </div>
      </a>
    </div>

    <div class="sidebar-footer">
      <a href="/" class="back-link" onclick={closeDrawer}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg
        >
        <span class="nav-label">Back to site</span>
      </a>
      <a href="/app/sign_out" class="sign-out-link" onclick={closeDrawer}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >
        <span class="nav-label">Sign Out</span>
      </a>
    </div>
  </div>
</div>

<!-- ════════════════════════ SHELL ════════════════════════ -->
<div class="admin-shell" class:sidebar-collapsed={collapsed}>
  <!-- Desktop Sidebar -->
  <aside class="sidebar" class:collapsed>
    <div class="sidebar-top">
      <div class="sidebar-logo">
        <a href="/" class="logo-link">
          {#if collapsed}
            <span class="logo-accent logo-collapsed-mark"
              >{WebsiteName.slice(0, 2)}</span
            >
          {:else}
            {WebsiteName.slice(0, -2)}<span class="logo-accent"
              >{WebsiteName.slice(-2)}</span
            >
          {/if}
        </a>
      </div>

      <!-- Collapse toggle -->
      <button
        class="collapse-btn"
        onclick={toggleCollapse}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="collapse-icon"
          class:flipped={collapsed}
        >
          <polyline points="11 17 6 12 11 7" /><polyline
            points="18 17 13 12 18 7"
          />
        </svg>
      </button>
    </div>

    {#if !collapsed}
      <p class="sidebar-section-label">Navigation</p>
    {/if}

    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item) ? 'active' : ''}"
          title={collapsed ? item.label : ""}
        >
          {@html item.icon}
          {#if !collapsed}
            <span class="nav-label">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Profile section at bottom -->
    <div class="sidebar-profile">
      <a
        href="/app/settings"
        class="profile-link"
        title={collapsed ? displayName() : ""}
      >
        {#if avatarUrl()}
          <img src={avatarUrl()} alt="" class="profile-avatar" />
        {:else}
          <div class="profile-avatar-placeholder">
            {initials(displayName())}
          </div>
        {/if}
        {#if !collapsed}
          <div class="profile-info">
            <span class="profile-name">{displayName()}</span>
            <span class="profile-actor {actorColorClass(actorType)}"
              >{actorLabel(actorType)}</span
            >
          </div>
        {/if}
      </a>
    </div>

    <div class="sidebar-footer">
      <a href="/" class="back-link" title={collapsed ? "Back to site" : ""}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg
        >
        {#if !collapsed}<span class="nav-label">Back to site</span>{/if}
      </a>
      <a
        href="/app/sign_out"
        class="sign-out-link"
        title={collapsed ? "Sign Out" : ""}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >
        {#if !collapsed}<span class="nav-label">Sign Out</span>{/if}
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
            ><line x1="3" y1="6" x2="21" y2="6" /><line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            /><line x1="3" y1="18" x2="21" y2="18" /></svg
          >
        </button>

        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/app/dashboard">Home</a>
          {#if adminSection && adminSection !== "dashboard"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {allNavItems.find((n) => n.id === adminSection)?.label ??
                adminSection}
            </span>
          {:else if currentPath !== "/app/dashboard"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {allNavItems.find(
                (n) =>
                  n.href !== "/app/dashboard" && currentPath.startsWith(n.href),
              )?.label ?? ""}
            </span>
          {/if}
        </nav>
      </div>

      <div class="topbar-right">
        <span class="connection-dot"></span>
        <span class="connection-label">Connected</span>
      </div>
    </div>

    <!-- Page content -->
    <div class="admin-content">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  /* ── Shell ── */
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
    --sidebar-width: 232px;
    --sidebar-collapsed-width: 64px;
  }
  .admin-shell.sidebar-collapsed {
    --sidebar-width: var(--sidebar-collapsed-width);
  }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar::-webkit-scrollbar {
    display: none;
  }
  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  /* ── Sidebar top: logo + collapse ── */
  .sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 14px 14px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
    gap: 4px;
  }
  .collapsed .sidebar-top {
    justify-content: center;
    padding: 18px 8px 14px;
  }

  .sidebar-logo {
    flex-shrink: 0;
  }
  .logo-link {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 2px;
    transition: opacity 0.2s;
    white-space: nowrap;
  }
  .logo-link:hover {
    opacity: 0.85;
  }
  .logo-accent {
    color: var(--orange);
  }
  .logo-collapsed-mark {
    font-size: 1.15rem;
  }

  .collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: none;
    border: 1px solid transparent;
    color: var(--text-3);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .collapse-btn:hover {
    background: var(--rim);
    border-color: var(--rim-2, rgba(255, 255, 255, 0.08));
    color: var(--text-1);
  }
  .collapsed .collapse-btn {
    display: none;
  }

  .collapse-icon {
    transition: transform 0.25s ease;
  }
  .collapse-icon.flipped {
    transform: rotate(180deg);
  }

  /* ── Section label ── */
  .sidebar-section-label {
    padding: 18px 18px 6px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
  }

  /* ── Nav ── */
  .sidebar-nav {
    padding: 4px 8px;
    flex: 1;
  }
  .collapsed .sidebar-nav {
    padding: 4px 6px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.84rem;
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
    white-space: nowrap;
    overflow: hidden;
  }
  .collapsed .nav-link {
    justify-content: center;
    padding: 10px;
    gap: 0;
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
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    border-radius: 0 3px 3px 0;
    background: var(--orange);
  }
  .collapsed .nav-link.active::before {
    left: -6px;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Profile section ── */
  .sidebar-profile {
    padding: 8px;
    border-top: 1px solid var(--rim);
    flex-shrink: 0;
  }

  .profile-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.15s;
  }
  .profile-link:hover {
    background: var(--rim);
  }
  .collapsed .profile-link {
    justify-content: center;
    padding: 8px;
    gap: 0;
  }

  .profile-avatar {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }
  .profile-avatar-placeholder {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(242, 101, 34, 0.15),
      rgba(242, 101, 34, 0.05)
    );
    border: 1px solid rgba(242, 101, 34, 0.2);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--orange);
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .collapsed .profile-avatar,
  .collapsed .profile-avatar-placeholder {
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .profile-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-actor {
    font-size: 0.65rem;
    font-weight: 600;
    margin-top: 1px;
    text-transform: capitalize;
  }
  /* Actor type colors */
  .actor-driver {
    color: #60a5fa;
  }
  .actor-conductor {
    color: #a78bfa;
  }
  .actor-passenger {
    color: #fbbf24;
  }
  .actor-fleet {
    color: #34d399;
  }
  .actor-operator {
    color: #f472b6;
  }
  .actor-org {
    color: #2dd4bf;
  }
  .actor-admin {
    color: #f87171;
  }
  .actor-regulator {
    color: #c084fc;
  }
  .actor-default {
    color: var(--text-3);
  }

  /* ── Footer ── */
  .sidebar-footer {
    padding: 8px 8px 12px;
    flex-shrink: 0;
  }
  .collapsed .sidebar-footer {
    padding: 8px 6px 12px;
  }

  .sign-out-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-3);
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
    white-space: nowrap;
    overflow: hidden;
  }
  .collapsed .sign-out-link {
    justify-content: center;
    padding: 9px;
    gap: 0;
  }
  .sign-out-link:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  .sign-out-link :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }
  .sign-out-link:hover :global(svg) {
    opacity: 1;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-3);
    text-decoration: none;
    transition:
      color 0.15s,
      background 0.15s;
    white-space: nowrap;
    overflow: hidden;
  }
  .collapsed .back-link {
    justify-content: center;
    padding: 8px;
    gap: 0;
  }
  .back-link:hover {
    color: var(--text-2);
    background: var(--rim);
  }

  /* ── Mobile overlay ── */
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
    width: 260px;
    background: var(--ink-2);
    border-right: 1px solid var(--rim-2, var(--rim));
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .mobile-panel-header {
    padding: 18px;
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
    transition: background 0.15s;
  }
  .mobile-close:hover {
    background: var(--rim-2, rgba(255, 255, 255, 0.08));
  }
  .mobile-panel .sidebar-profile {
    margin-top: auto;
  }

  /* ── Main area ── */
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
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    box-shadow: 0 0 6px rgba(0, 176, 155, 0.6);
  }
  .connection-label {
    font-size: 0.72rem;
    color: var(--text-3);
    font-weight: 500;
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
