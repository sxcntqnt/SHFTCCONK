<script lang="ts">
  import "../../../../app.css"
  import { writable } from "svelte/store"
  import { setContext } from "svelte"
  import { page } from "$app/stores"
  import { WebsiteName } from "../../../../config"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  const adminSectionStore = writable("")
  setContext("adminSection", adminSectionStore)
  let adminSection: string | undefined = $state()
  adminSectionStore.subscribe((value) => { adminSection = value })

  let mobileOpen = $state(false)

  function closeDrawer() { mobileOpen = false }

  let currentPath = $derived($page.url.pathname)

  const navItems = [
    {
      key: "home",
      label: "Dashboard",
      href: "/account",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "billing",
      label: "Billing",
      href: "/account/billing",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    },
    {
      key: "settings",
      label: "Settings",
      href: "/account/settings",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
    },
  ]

  function isActive(item: { key: string; href: string }): boolean {
    if (adminSection) return adminSection === item.key
    if (item.href === "/account") return currentPath === "/account"
    return currentPath.startsWith(item.href)
  }
</script>

<style>
  /* ── Shell ── */
  .admin-shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  /* ════════════════════════
     SIDEBAR
  ════════════════════════ */
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
  .sidebar::-webkit-scrollbar { display: none; }

  /* Logo */
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
  .logo-link:hover { opacity: 0.85; }
  .logo-link span { color: var(--orange); }

  /* Nav section */
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
    transition: background 0.15s, color 0.15s, border-color 0.15s;
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
  .nav-link:hover :global(svg) { opacity: 0.9; }
  .nav-link.active {
    background: rgba(242,101,34,0.1);
    border-color: rgba(242,101,34,0.2);
    color: var(--orange);
    font-weight: 600;
  }
  .nav-link.active :global(svg) { opacity: 1; }

  /* Active indicator bar */
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    border-radius: 0 3px 3px 0;
    background: var(--orange);
  }

  /* Sidebar footer */
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
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sign-out-link:hover {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.15);
    color: #f87171;
  }
  .sign-out-link :global(svg) { opacity: 0.6; }
  .sign-out-link:hover :global(svg) { opacity: 1; }

  /* Back to site */
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
    transition: color 0.15s, background 0.15s;
  }
  .back-link:hover { color: var(--text-2); background: var(--rim); }

  /* ════════════════════════
     MOBILE OVERLAY
  ════════════════════════ */
  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(6px);
  }
  .mobile-overlay.open { display: block; }

  .mobile-panel {
    position: absolute;
    left: 0; top: 0;
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
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--rim);
    border: none; cursor: pointer;
    color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  .mobile-close:hover { background: var(--rim-2); }

  /* ════════════════════════
     MAIN AREA
  ════════════════════════ */
  .admin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* Topbar */
  .admin-topbar {
    height: 54px;
    padding: 0 32px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10,10,12,0.7);
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
    transition: background 0.15s, color 0.15s;
  }
  .hamburger:hover { background: var(--rim); color: var(--text-1); }

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
  .breadcrumb a:hover { color: var(--text-2); }
  .breadcrumb-sep { opacity: 0.35; font-size: 0.9rem; }
  .breadcrumb-current {
    color: var(--text-1);
    font-weight: 500;
  }

  /* Content */
  .admin-content {
    flex: 1;
    padding: 40px 44px;
    max-width: 1080px;
  }

  /* ════════════════════════
     RESPONSIVE
  ════════════════════════ */
  @media (max-width: 1024px) {
    .sidebar { display: none; }
    .hamburger { display: flex; }
    .admin-topbar { padding: 0 20px; }
    .admin-content { padding: 28px 20px; }
  }
</style>

<!-- ════════════════════════ MOBILE OVERLAY ════════════════════════ -->
<div
  class="mobile-overlay {mobileOpen ? 'open' : ''}"
  onclick={closeDrawer}
>
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to site
      </a>
      <a href="/account/sign_out" class="sign-out-link" onclick={closeDrawer}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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
        <a
          href={item.href}
          class="nav-link {isActive(item) ? 'active' : ''}"
        >
          {@html item.icon}
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="back-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to site
      </a>
      <a href="/account/sign_out" class="sign-out-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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
        <button class="hamburger" onclick={() => mobileOpen = true} aria-label="Open menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span class="breadcrumb-sep">›</span>
          <a href="/account">Account</a>
          {#if adminSection && adminSection !== "home"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {navItems.find(n => n.key === adminSection)?.label ?? adminSection}
            </span>
          {:else if currentPath !== "/account"}
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">
              {navItems.find(n => n.href !== "/account" && currentPath.startsWith(n.href))?.label ?? ""}
            </span>
          {/if}
        </nav>
      </div>

      <!-- Right side — subtle status indicator -->
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 6px rgba(0,176,155,0.6);"></span>
        <span style="font-size:0.72rem;color:var(--text-3);font-weight:500;">Connected</span>
      </div>
    </div>

    <!-- Page content -->
    <div class="admin-content">
      {@render children?.()}
    </div>

  </div>
</div>