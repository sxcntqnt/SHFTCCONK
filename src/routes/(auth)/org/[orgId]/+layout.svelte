<!-- src/routes/(auth)/org/[orgId]/+layout.svelte -->
<!--
  CONTEXT ARCHITECTURE:
    Server (+layout.server.ts) validates DB access and returns contextType.
    This component activates the correct context store in onMount.

    Why onMount and not $effect?
      Context activation writes to module-level Svelte stores.
      $effect runs during SSR where stores are always empty — activating
      there is a no-op and can cause hydration mismatches.
      onMount is browser-only, which is exactly where we need the stores.

    Why not +layout.ts (universal load)?
      Universal loads run on the server too (SSR). activateOrgChairContext
      and activateOrgContext write to Svelte stores — server-side writes
      are silently dropped. The guard calls must happen client-side.

  PERMISSION READS:
    After activation, permission stores from both contexts are reactive.
    Each nav item uses a $derived boolean combining chair + staff stores
    so the nav renders correctly for either role.
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { page } from "$app/state"
  import { goto } from "$app/navigation"
  import type { Snippet } from "svelte"
  import {
    // ── Context activators ───────────────────────────────────────────────
    orgChairCtx,
    activateOrgChairContext,
    deactivateOrgChairContext,
    orgCtx,
    activateOrgContext,
    deactivateOrgContext,
    // ── Org chair permissions ────────────────────────────────────────────
    canApproveMembers,
    canOrgChairViewFinance,
    canViewOrgReports,
    canChangeSettings,
    canManageVehicles,
    // ── Org staff permissions ────────────────────────────────────────────
    orgCanListVehicles,
    orgCanViewFinance,
    orgCanViewReports,
    orgCanChangeSettings,
    orgCanApproveMembers,
    orgCanViewMemberRequests,
  } from "$lib/features/auth/contexts"
  import { sessionStore } from "$lib/features/auth/stores/auth"

  // ── Props ─────────────────────────────────────────────────────────────────

  let {
    children,
    data,
  }: {
    children: Snippet
    data: {
      orgId: string
      organization: { id: string; name: string; status: string } | null
      branches: { id: string; name: string }[]
      vehicleCount: number
      memberCount: number
      userOrgRole: string | null
      contextType: "chair" | "staff"
    }
  } = $props()

  // ── Activate context on mount ─────────────────────────────────────────────
  // Deactivate on destroy to avoid stale state if user navigates away.

  onMount(() => {
    if (!$sessionStore.profile) {
      goto("/login/sign_in")
      return
    }

    if (data.contextType === "chair") {
      activateOrgChairContext(data.orgId)
    } else {
      activateOrgContext(data.orgId)
    }
  })

  onDestroy(() => {
    if (data.contextType === "chair") {
      deactivateOrgChairContext()
    } else {
      deactivateOrgContext()
    }
  })

  // ── Derived display values ────────────────────────────────────────────────

  let activeOrgName = $derived(
    $orgChairCtx?.orgName ??
      $orgCtx?.orgName ??
      data.organization?.name ??
      "SACCO",
  )

  let activeRoleLabel = $derived(
    (
      $orgChairCtx?.actor.type ??
      $orgCtx?.roleType ??
      data.userOrgRole ??
      "MEMBER"
    ).replace(/_/g, " "),
  )

  // ── Combined permission booleans ──────────────────────────────────────────
  // Each nav item's visibility is a $derived that works for either role.

  let canSeeFleet = $derived($canManageVehicles || $orgCanListVehicles)
  let canSeeMembers = $derived(
    $canApproveMembers || $orgCanApproveMembers || $orgCanViewMemberRequests,
  )
  let canSeeFinance = $derived($canOrgChairViewFinance || $orgCanViewFinance)
  let canSeeReports = $derived($canViewOrgReports || $orgCanViewReports)
  let canSeeSettings = $derived($canChangeSettings || $orgCanChangeSettings)
  // Compliance is safety-critical — visible to all authenticated org members
  let canSeeCompliance = $derived($orgChairCtx !== null || $orgCtx !== null)

  // ── UI state ──────────────────────────────────────────────────────────────

  let currentPath = $derived(page.url.pathname)
  let mobileOpen = $state(false)
  let profile = $derived($sessionStore.profile)
  let dashboardHref = $derived(`/org/${data.orgId}/dashboard`)

  function isActive(href: string): boolean {
    return currentPath === href || currentPath.startsWith(href + "/")
  }

  function initials(name: string | null | undefined): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  // ── Nav items ─────────────────────────────────────────────────────────────

  let navItems = $derived([
    {
      label: "Dashboard",
      href: `/org/${data.orgId}/dashboard`,
      exact: true,
      visible: true,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>`,
    },
    {
      label: "Fleet",
      href: `/org/${data.orgId}/fleet`,
      badge: data.vehicleCount > 0 ? data.vehicleCount : undefined,
      exact: false,
      visible: canSeeFleet,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>`,
    },
    {
      label: "Members",
      href: `/org/${data.orgId}/members`,
      exact: false,
      visible: canSeeMembers,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>`,
    },
    {
      label: "Finance",
      href: `/org/${data.orgId}/finance`,
      exact: false,
      visible: canSeeFinance,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>`,
    },
    {
      label: "Routes",
      href: `/org/${data.orgId}/routes`,
      exact: false,
      visible: true,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>`,
    },
    {
      label: "Compliance",
      href: `/org/${data.orgId}/compliance`,
      exact: false,
      visible: canSeeCompliance,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>`,
    },
    {
      label: "Reports",
      href: `/org/${data.orgId}/reports`,
      exact: false,
      visible: canSeeReports,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>`,
    },
    {
      label: "Settings",
      href: `/org/${data.orgId}/settings`,
      exact: false,
      visible: canSeeSettings,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>`,
    },
  ])

  let visibleNavItems = $derived(navItems.filter((i) => i.visible))
</script>

<!-- Mobile overlay -->
{#if mobileOpen}
  <div
    class="mob-overlay"
    role="button"
    tabindex="0"
    onclick={() => (mobileOpen = false)}
    onkeydown={(e) => e.key === "Escape" && (mobileOpen = false)}
  >
    <div
      class="mob-panel"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
    >
      <div class="mob-head">
        <span class="org-name-text">{activeOrgName}</span>
        <button class="close-x" onclick={() => (mobileOpen = false)}>✕</button>
      </div>
      <nav class="sidebar-nav">
        {#each visibleNavItems as item}
          <a
            href={item.href}
            class="nav-link"
            class:active={item.exact
              ? currentPath === item.href
              : isActive(item.href)}
            onclick={() => (mobileOpen = false)}
          >
            {@html item.icon}
            {item.label}
            {#if item.badge}<span class="nav-badge">{item.badge}</span>{/if}
          </a>
        {/each}
      </nav>
    </div>
  </div>
{/if}

<div class="shell">
  <aside class="sidebar">
    <div class="sb-header">
      <div class="org-avatar">{initials(activeOrgName)}</div>
      <div class="sb-org-info">
        <span class="sb-org-name">{activeOrgName}</span>
        <span
          class="sb-org-status"
          class:status-active={data.organization?.status === "active"}
        >
          {data.organization?.status ?? ""}
        </span>
      </div>
    </div>

    <nav class="sidebar-nav">
      {#each visibleNavItems as item}
        <a
          href={item.href}
          class="nav-link"
          class:active={item.exact
            ? currentPath === item.href
            : isActive(item.href)}
        >
          {@html item.icon}
          {item.label}
          {#if item.badge}<span class="nav-badge">{item.badge}</span>{/if}
        </a>
      {/each}
    </nav>

    <div class="sb-stats">
      <div class="sb-stat">
        <span class="sb-stat-num">{data.vehicleCount}</span>
        <span class="sb-stat-lbl">Vehicles</span>
      </div>
      <div class="sb-stat-divider"></div>
      <div class="sb-stat">
        <span class="sb-stat-num">{data.memberCount}</span>
        <span class="sb-stat-lbl">Members</span>
      </div>
    </div>

    <div class="sb-footer">
      {#if profile}
        <div class="user-card">
          <div class="user-av">{initials(profile.full_name)}</div>
          <div>
            <div class="user-name">{profile.full_name ?? "User"}</div>
            <div class="user-role">{activeRoleLabel}</div>
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
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
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
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <nav class="breadcrumb">
          <a href="/org/select">SACCOs</a>
          <span class="bc-sep">›</span>
          <span class="bc-org">{activeOrgName}</span>
          {#if currentPath !== dashboardHref}
            <span class="bc-sep">›</span>
            <span class="bc-cur">
              {visibleNavItems.find((n) => !n.exact && isActive(n.href))
                ?.label ?? ""}
            </span>
          {/if}
        </nav>
      </div>
      <div class="org-pill">
        <span class="org-pill-dot"></span>
        {activeRoleLabel}
      </div>
    </div>

    <div class="content">
      {@render children()}
    </div>
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
    margin: 0;
  }
  .shell {
    display: flex;
    min-height: 100vh;
    background: #0a0a0c;
    color: #e2e4e9;
  }
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #0f0f12;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
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
  .sb-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }
  .org-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.2),
      rgba(168, 85, 247, 0.08)
    );
    border: 1px solid rgba(168, 85, 247, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #c084fc;
    flex-shrink: 0;
  }
  .sb-org-info {
    min-width: 0;
  }
  .sb-org-name {
    display: block;
    font-size: 0.88rem;
    font-weight: 700;
    color: #f0f1f4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sb-org-status {
    display: inline-block;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #facc15;
    margin-top: 0.1rem;
  }
  .sb-org-status.status-active {
    color: #4ade80;
  }
  .sidebar-nav {
    padding: 0.75rem 0.65rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    border-radius: 9px;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s;
    position: relative;
  }
  .nav-link :global(svg) {
    flex-shrink: 0;
    opacity: 0.45;
    transition: opacity 0.15s;
  }
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #d4d7e0;
  }
  .nav-link:hover :global(svg) {
    opacity: 0.8;
  }
  .nav-link.active {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.2);
    color: #c084fc;
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
    height: 16px;
    border-radius: 0 3px 3px 0;
    background: #c084fc;
  }
  .nav-badge {
    margin-left: auto;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: rgba(168, 85, 247, 0.25);
    border: 1px solid rgba(168, 85, 247, 0.3);
    font-size: 0.6rem;
    font-weight: 700;
    color: #c084fc;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
  .sb-stats {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }
  .sb-stat {
    flex: 1;
    text-align: center;
  }
  .sb-stat-num {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: #f0f1f4;
  }
  .sb-stat-lbl {
    display: block;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.25);
    margin-top: 0.1rem;
  }
  .sb-stat-divider {
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }
  .sb-footer {
    padding: 0.75rem 0.65rem;
    flex-shrink: 0;
  }
  .user-card {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.75rem;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 0.4rem;
  }
  .user-av {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .user-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #f0f1f4;
  }
  .user-role {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: capitalize;
  }
  .sign-out {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sign-out:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #f87171;
  }
  .mob-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.7);
  }
  .mob-panel {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 240px;
    background: #0f0f12;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
  }
  .mob-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }
  .org-name-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: #f0f1f4;
  }
  .close-x {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    font-size: 1rem;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 52px;
    padding: 0 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 12, 0.8);
    backdrop-filter: blur(16px);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }
  .tb-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
  }
  .hamburger:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #f0f1f4;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.3);
  }
  .breadcrumb a {
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
  }
  .breadcrumb a:hover {
    color: rgba(255, 255, 255, 0.5);
  }
  .bc-sep {
    opacity: 0.3;
  }
  .bc-org {
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }
  .bc-cur {
    color: #f0f1f4;
    font-weight: 500;
  }
  .org-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.8rem;
    background: rgba(168, 85, 247, 0.08);
    border: 1px solid rgba(168, 85, 247, 0.15);
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    color: #c084fc;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .org-pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #c084fc;
  }
  .content {
    flex: 1;
    padding: 2.25rem 2.5rem;
  }
  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
    .hamburger {
      display: flex;
    }
    .topbar {
      padding: 0 1.25rem;
    }
    .content {
      padding: 1.5rem 1.25rem;
    }
  }
</style>
