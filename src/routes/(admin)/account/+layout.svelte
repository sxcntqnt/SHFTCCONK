<script lang="ts">
  import { invalidate } from "$app/navigation"
  import { onMount } from "svelte"
  import { page } from "$app/stores"

  let { data, children } = $props()
  let { supabase, session, profile } = $state(data)

  $effect(() => {
    ;({ supabase, session, profile } = data)
  })

  onMount(() => {
    const { data: authData } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        invalidate("supabase:auth")
      }
    })
    return () => authData.subscription.unsubscribe()
  })

  /* ── Nav items ── */
  const navItems = [
    {
      label: "Dashboard",
      href: "/account",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
    },
    {
      label: "Profile",
      href: "/account/edit_profile",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    },
    {
      label: "Security",
      href: "/account/security",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    },
    {
      label: "Billing",
      href: "/account/billing",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`
    },
  ]

  let currentPath = $derived($page.url.pathname)

  /* Avatar initials */
  function initials(name: string | null | undefined): string {
    if (!name) return "?"
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  }

  /* Sign out */
  async function signOut() {
    await supabase.auth.signOut()
  }

  /* Mobile sidebar toggle */
  let sidebarOpen = $state(false)
</script>

<style>
  .admin-root {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--rim);
  }
  .sidebar-logo a {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    text-decoration: none;
  }
  .sidebar-logo a span { color: var(--orange); }

  .sidebar-section-label {
    padding: 20px 20px 8px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .sidebar-nav {
    padding: 4px 12px;
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
    transition: background 0.15s, color 0.15s;
    margin-bottom: 2px;
  }
  .nav-link :global(svg) { flex-shrink: 0; opacity: 0.7; }
  .nav-link:hover { background: var(--rim); color: var(--text-1); }
  .nav-link:hover :global(svg) { opacity: 1; }
  .nav-link.active {
    background: rgba(242,101,34,0.1);
    color: var(--orange);
    border: 1px solid rgba(242,101,34,0.18);
  }
  .nav-link.active :global(svg) { opacity: 1; }

  /* ── SIDEBAR FOOTER ── */
  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid var(--rim);
  }

  .user-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 8px;
    background: var(--surface);
    border: 1px solid var(--rim);
  }
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .user-info { min-width: 0; }
  .user-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-email {
    font-size: 0.7rem;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sign-out-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-3);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
  }
  .sign-out-btn:hover { background: var(--rim); color: var(--text-2); }

  /* ── MAIN CONTENT ── */
  .admin-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* Top bar (mobile + breadcrumb) */
  .admin-topbar {
    height: 56px;
    padding: 0 28px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10,10,12,0.6);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .topbar-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--text-3);
  }
  .topbar-breadcrumb a {
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .topbar-breadcrumb a:hover { color: var(--text-2); }
  .topbar-breadcrumb-sep { opacity: 0.4; }
  .topbar-breadcrumb-current { color: var(--text-1); font-weight: 500; }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Mobile hamburger */
  .mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-2);
    padding: 6px;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .mobile-menu-btn:hover { background: var(--rim); }

  /* Content area */
  .admin-content {
    flex: 1;
    padding: 36px 40px;
    max-width: 1100px;
  }

  /* ── MOBILE OVERLAY ── */
  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
  }
  .mobile-sidebar {
    position: absolute;
    left: 0; top: 0;
    height: 100%;
    width: 240px;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .mobile-menu-btn { display: flex; }
    .mobile-overlay.open { display: block; }
    .admin-content { padding: 24px 20px; }
    .admin-topbar { padding: 0 16px; }
  }
</style>

<div class="admin-root">

  <!-- ═══ DESKTOP SIDEBAR ═══ -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <a href="/">Matatu<span>Pulse</span></a>
    </div>

    <p class="sidebar-section-label">Account</p>
    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {currentPath === item.href || currentPath.startsWith(item.href + '/') ? 'active' : ''}"
        >
          {@html item.icon}
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <div class="user-row">
        <div class="user-avatar">{initials(data.profile?.full_name)}</div>
        <div class="user-info">
          <div class="user-name">{data.profile?.full_name ?? "Account"}</div>
          <div class="user-email">{data.session?.user?.email ?? ""}</div>
        </div>
      </div>
      <a href="/account/sign_out" class="sign-out-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign out
      </a>
    </div>
  </aside>

  <!-- ═══ MOBILE OVERLAY SIDEBAR ═══ -->
  <div class="mobile-overlay {sidebarOpen ? 'open' : ''}" onclick={() => sidebarOpen = false}>
    <div class="mobile-sidebar" onclick={(e) => e.stopPropagation()}>
      <div class="sidebar-logo" style="display:flex;align-items:center;justify-content:space-between;">
        <a href="/">Matatu<span>Pulse</span></a>
        <button
          style="background:none;border:none;cursor:pointer;color:var(--text-2);padding:4px;"
          onclick={() => sidebarOpen = false}
        >✕</button>
      </div>
      <p class="sidebar-section-label">Account</p>
      <nav class="sidebar-nav">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-link {currentPath === item.href ? 'active' : ''}"
            onclick={() => sidebarOpen = false}
          >
            {@html item.icon}
            {item.label}
          </a>
        {/each}
      </nav>
      <div class="sidebar-footer">
        <div class="user-row">
          <div class="user-avatar">{initials(data.profile?.full_name)}</div>
          <div class="user-info">
            <div class="user-name">{data.profile?.full_name ?? "Account"}</div>
            <div class="user-email">{data.session?.user?.email ?? ""}</div>
          </div>
        </div>
        <a href="/account/sign_out" class="sign-out-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </a>
      </div>
    </div>
  </div>

  <!-- ═══ MAIN ═══ -->
  <div class="admin-main">

    <!-- Top bar -->
    <div class="admin-topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="mobile-menu-btn" onclick={() => sidebarOpen = true} aria-label="Open menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <nav class="topbar-breadcrumb">
          <a href="/">Home</a>
          <span class="topbar-breadcrumb-sep">›</span>
          <a href="/account">Account</a>
          {#if currentPath !== "/account"}
            <span class="topbar-breadcrumb-sep">›</span>
            <span class="topbar-breadcrumb-current">
              {navItems.find(n => currentPath.startsWith(n.href) && n.href !== "/account")?.label ?? ""}
            </span>
          {/if}
        </nav>
      </div>

      <div class="topbar-right">
        <a href="/" style="font-size:0.78rem;color:var(--text-3);text-decoration:none;transition:color 0.2s;"
           onmouseenter={(e) => e.currentTarget.style.color = 'var(--text-1)'}
           onmouseleave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
        >
          ← Back to site
        </a>
      </div>
    </div>

    <!-- Page content -->
    <div class="admin-content">
      {@render children?.()}
    </div>

  </div>
</div>