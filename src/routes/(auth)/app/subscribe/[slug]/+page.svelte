<script lang="ts">
  import { enhance } from '$app/forms'
  import {
    Route, Shield, MapPin, Truck, Users, GitBranch,
    Bell, BellRing, CheckCircle, Clock, ChevronDown,
    ChevronRight, AlertCircle, UserCheck, Fingerprint,
    Navigation, Fuel, X
  } from '@lucide/svelte'

  type Data = {
    profile: any
    org: any
    routes: any[]
    vehicles: any[]
    branches: any[]
    memberCount: number
    userActors: any[]
    existingMembership: any
    pendingRequest: any
    roles: any[]
    slug: string
  }

  let { data, form }: { data: Data; form: any } = $props()

  // State
  let activeTab: 'routes' | 'verify' = $state('routes')
  let selectAll = $state(true)
  let selectedRoutes: Set<string> = $state(new Set())
  let isSubmitting = $state(false)
  let showVehicles = $state(false)
  let selectedRole = $state('')
  let verifyNote = $state('')

  // Derived
  let subscribeSuccess = $derived(form?.subscribed === true)
  let verifySuccess = $derived(form?.verified === true)
  let hasError = $derived(!!form?.error)

  function toggleRoute(id: string) {
    const next = new Set(selectedRoutes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedRoutes = next
    if (next.size < data.routes.length) selectAll = false
    if (next.size === data.routes.length) selectAll = true
  }

  function toggleAll() {
    selectAll = !selectAll
    if (selectAll) {
      selectedRoutes = new Set(data.routes.map(r => r.id))
    } else {
      selectedRoutes = new Set()
    }
  }

  function formatRoute(route: any): string {
    if (!route) return 'Route details unavailable'
    if (typeof route === 'string') return route
    if (route.from && route.to) return `${route.from} → ${route.to}`
    if (route.name) return route.name
    if (Array.isArray(route)) return route.join(' → ')
    return JSON.stringify(route)
  }

  function roleLabel(id: string): string {
    const role = data.roles.find(r => r.id === id)
    return role?.display_name || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  // Initialize all routes selected
  $effect(() => {
    if (data.routes.length > 0 && selectedRoutes.size === 0 && selectAll) {
      selectedRoutes = new Set(data.routes.map(r => r.id))
    }
  })
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="sub-root">
  <div class="sub-bg">
    <div class="sub-bg-orb sub-bg-orb-1"></div>
    <div class="sub-bg-orb sub-bg-orb-2"></div>
    <div class="sub-bg-grid"></div>
  </div>

  <div class="sub-container">

    <!-- Org header -->
    <header class="sub-org-header" style="animation-delay: 0ms">
      <div class="sub-org-top">
        <div class="sub-org-icon">
          <Navigation size={22} strokeWidth={2} />
        </div>
        <div class="sub-org-info">
          <h1 class="sub-org-name">{data.org.name}</h1>
          <div class="sub-org-meta">
            {#if data.org.status}
              <span class="sub-org-status sub-status-{data.org.status || 'active'}">{data.org.status}</span>
            {/if}
            <span class="sub-org-slug">/{data.slug}</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="sub-stats-bar">
        <div class="sub-stat-item">
          <Users size={14} strokeWidth={2} />
          <span class="sub-stat-val">{data.memberCount}</span>
          <span class="sub-stat-lbl">Members</span>
        </div>
        <div class="sub-stat-sep"></div>
        <div class="sub-stat-item">
          <Route size={14} strokeWidth={2} />
          <span class="sub-stat-val">{data.routes.length}</span>
          <span class="sub-stat-lbl">Routes</span>
        </div>
        <div class="sub-stat-sep"></div>
        <div class="sub-stat-item">
          <Truck size={14} strokeWidth={2} />
          <span class="sub-stat-val">{data.vehicles.length}</span>
          <span class="sub-stat-lbl">Vehicles</span>
        </div>
        <div class="sub-stat-sep"></div>
        <div class="sub-stat-item">
          <GitBranch size={14} strokeWidth={2} />
          <span class="sub-stat-val">{data.branches.length}</span>
          <span class="sub-stat-lbl">Branches</span>
        </div>
      </div>

      <!-- Existing membership badge -->
      {#if data.existingMembership}
        <div class="sub-membership-badge">
          <UserCheck size={15} strokeWidth={2} />
          <span>You're a verified <strong>{data.existingMembership.role}</strong> of this organization</span>
        </div>
      {/if}
    </header>

    <!-- Tab switcher -->
    <div class="sub-tabs" style="animation-delay: 80ms">
      <button
        class="sub-tab"
        class:sub-tab-active={activeTab === 'routes'}
        onclick={() => activeTab = 'routes'}
      >
        <Bell size={15} strokeWidth={2} />
        Route Updates
      </button>
      <button
        class="sub-tab"
        class:sub-tab-active={activeTab === 'verify'}
        onclick={() => activeTab = 'verify'}
      >
        <Fingerprint size={15} strokeWidth={2} />
        Identity Verification
        {#if data.pendingRequest}
          <span class="sub-tab-badge">Pending</span>
        {/if}
      </button>
    </div>

    <!-- Error display -->
    {#if hasError}
      <div class="sub-error sub-slide-in">
        <AlertCircle size={15} strokeWidth={2} />
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- ═══════════════ ROUTES TAB ═══════════════ -->
    {#if activeTab === 'routes'}
      <div class="sub-panel sub-slide-in" style="animation-delay: 120ms">

        {#if subscribeSuccess}
          <!-- Success state -->
          <div class="sub-success-state">
            <div class="sub-success-ring">
              <BellRing size={28} strokeWidth={1.5} />
            </div>
            <h2 class="sub-success-h">Subscribed</h2>
            <p class="sub-success-p">
              You'll now receive route updates from <strong>{data.org.name}</strong>.
              Updates include schedule changes, route modifications, fare adjustments, and service alerts.
            </p>
          </div>

        {:else}
          <div class="sub-panel-header">
            <div>
              <h2 class="sub-panel-title">Subscribe to Route Updates</h2>
              <p class="sub-panel-desc">Choose which routes to follow. You'll get notified about schedule changes, detours, fare updates, and service alerts.</p>
            </div>
          </div>

          <!-- Route list -->
          {#if data.routes.length > 0}
            <div class="sub-route-controls">
              <button class="sub-select-all" onclick={toggleAll}>
                <div class="sub-checkbox" class:sub-checked={selectAll}>
                  {#if selectAll}
                    <CheckCircle size={14} strokeWidth={2.5} />
                  {/if}
                </div>
                <span>{selectAll ? 'Deselect all' : 'Select all routes'}</span>
              </button>
              <span class="sub-route-count">{selectedRoutes.size} of {data.routes.length} selected</span>
            </div>

            <div class="sub-route-list">
              {#each data.routes as route, i}
                <button
                  class="sub-route-item"
                  class:sub-route-selected={selectedRoutes.has(route.id)}
                  onclick={() => toggleRoute(route.id)}
                  style="animation-delay: {160 + i * 40}ms"
                >
                  <div class="sub-checkbox" class:sub-checked={selectedRoutes.has(route.id)}>
                    {#if selectedRoutes.has(route.id)}
                      <CheckCircle size={14} strokeWidth={2.5} />
                    {/if}
                  </div>
                  <div class="sub-route-info">
                    <div class="sub-route-name">
                      <MapPin size={13} strokeWidth={2} />
                      {route.stage_name}
                    </div>
                    <div class="sub-route-detail">{formatRoute(route.route)}</div>
                  </div>
                  {#if route.created_at}
                    <span class="sub-route-time">{timeAgo(route.created_at)}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {:else}
            <div class="sub-empty-routes">
              <Route size={28} strokeWidth={1.5} />
              <p>No routes published yet for this organization. Subscribe to all routes to get notified when new ones are added.</p>
            </div>
          {/if}

          <!-- Vehicles peek -->
          {#if data.vehicles.length > 0}
            <button class="sub-vehicles-toggle" onclick={() => showVehicles = !showVehicles}>
              {#if showVehicles}
                <ChevronDown size={14} strokeWidth={2} />
              {:else}
                <ChevronRight size={14} strokeWidth={2} />
              {/if}
              <Truck size={14} strokeWidth={2} />
              <span>{data.vehicles.length} vehicles operating</span>
            </button>

            {#if showVehicles}
              <div class="sub-vehicles-grid sub-slide-in">
                {#each data.vehicles as v}
                  <div class="sub-vehicle-chip" class:sub-vehicle-active={v.active}>
                    <span class="sub-vehicle-reg">{v.reg_number}</span>
                    {#if v.capacity}
                      <span class="sub-vehicle-cap">{v.capacity} seats</span>
                    {/if}
                    <span class="sub-vehicle-dot" class:sub-vdot-on={v.active} class:sub-vdot-off={!v.active}></span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}

          <!-- Subscribe action -->
          <form
            method="POST"
            action="?/subscribe"
            use:enhance={() => {
              isSubmitting = true
              return async ({ update }) => { isSubmitting = false; await update() }
            }}
            class="sub-action-bar"
          >
            <input type="hidden" name="all_routes" value={selectAll ? 'true' : 'false'} />
            {#each [...selectedRoutes] as rid}
              <input type="hidden" name="route_ids" value={rid} />
            {/each}

            <button type="submit" class="sub-btn-subscribe" disabled={isSubmitting || (!selectAll && selectedRoutes.size === 0)}>
              {#if isSubmitting}
                <span class="sub-spinner"></span>
                Subscribing…
              {:else}
                <Bell size={16} strokeWidth={2.5} />
                Subscribe to {selectAll ? 'All' : selectedRoutes.size} Route{selectedRoutes.size !== 1 || selectAll ? 's' : ''}
              {/if}
            </button>
          </form>
        {/if}
      </div>
    {/if}

    <!-- ═══════════════ VERIFY TAB ═══════════════ -->
    {#if activeTab === 'verify'}
      <div class="sub-panel sub-slide-in" style="animation-delay: 120ms">

        {#if verifySuccess}
          <div class="sub-success-state">
            <div class="sub-success-ring sub-success-verify">
              <Shield size={28} strokeWidth={1.5} />
            </div>
            <h2 class="sub-success-h">Verification Submitted</h2>
            <p class="sub-success-p">
              Your request has been sent to <strong>{data.org.name}</strong> admins for review.
              You'll be notified once your identity is verified and your role is activated.
            </p>
          </div>

        {:else if data.pendingRequest}
          <!-- Pending request state -->
          <div class="sub-pending-state">
            <div class="sub-pending-icon">
              <Clock size={24} strokeWidth={1.5} />
            </div>
            <h2 class="sub-pending-h">Verification Pending</h2>
            <p class="sub-pending-p">
              You submitted a request to be verified as
              <strong>{roleLabel(data.pendingRequest.requested_type)}</strong>
              {#if data.pendingRequest.created_at}
                — {timeAgo(data.pendingRequest.created_at)}.
              {/if}
              An admin will review and approve it.
            </p>
            <div class="sub-pending-detail">
              <span class="sub-pending-label">Request ID</span>
              <code class="sub-pending-code">{data.pendingRequest.id}</code>
            </div>
          </div>

        {:else if data.existingMembership}
          <!-- Already verified -->
          <div class="sub-verified-state">
            <div class="sub-verified-icon">
              <UserCheck size={28} strokeWidth={1.5} />
            </div>
            <h2 class="sub-verified-h">You're Verified</h2>
            <p class="sub-verified-p">
              You're an active <strong>{data.existingMembership.role}</strong> member of {data.org.name}.
              Your identity is confirmed and your permissions are live.
            </p>
            <div class="sub-actor-chips">
              {#each data.userActors as actor}
                <div class="sub-actor-chip sub-actor-{actor.type}">
                  <span>{actor.type.replace(/_/g, ' ')}</span>
                  {#if actor.status !== 'active'}
                    <span class="sub-actor-badge">{actor.status}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

        {:else}
          <!-- Verification form -->
          <div class="sub-panel-header">
            <div>
              <h2 class="sub-panel-title">Verify Your Identity</h2>
              <p class="sub-panel-desc">
                Request verification as a member of <strong>{data.org.name}</strong>.
                This links your profile to the organization and unlocks role-specific permissions — route access, fleet controls, ticketing, and more.
              </p>
            </div>
          </div>

          <!-- How it works -->
          <div class="sub-how-it-works">
            <div class="sub-step">
              <div class="sub-step-num">1</div>
              <div class="sub-step-text">
                <strong>Select your role</strong>
                <span>Choose the role that matches your position within the organization</span>
              </div>
            </div>
            <div class="sub-step-connector"></div>
            <div class="sub-step">
              <div class="sub-step-num">2</div>
              <div class="sub-step-text">
                <strong>Submit for review</strong>
                <span>An org admin reviews your request and verifies your identity</span>
              </div>
            </div>
            <div class="sub-step-connector"></div>
            <div class="sub-step">
              <div class="sub-step-num">3</div>
              <div class="sub-step-text">
                <strong>Get activated</strong>
                <span>Once approved, your actor role and permissions go live instantly</span>
              </div>
            </div>
          </div>

          <form
            method="POST"
            action="?/verify"
            use:enhance={() => {
              isSubmitting = true
              return async ({ update }) => { isSubmitting = false; await update() }
            }}
            class="sub-verify-form"
          >
            <div class="sub-field">
              <label class="sub-label">Role</label>
              <div class="sub-role-grid">
                {#each data.roles as role}
                  <label class="sub-role-option" class:sub-role-selected={selectedRole === role.id}>
                    <input type="radio" name="role" value={role.id} bind:group={selectedRole} class="sub-role-radio" />
                    <div class="sub-role-content">
                      <span class="sub-role-name">{role.display_name}</span>
                      {#if role.description}
                        <span class="sub-role-desc">{role.description}</span>
                      {/if}
                    </div>
                    <div class="sub-role-check">
                      {#if selectedRole === role.id}
                        <CheckCircle size={16} strokeWidth={2.5} />
                      {/if}
                    </div>
                  </label>
                {/each}
              </div>
            </div>

            <div class="sub-field">
              <label for="verify-note" class="sub-label">Additional Context <span class="sub-optional">(optional)</span></label>
              <textarea
                id="verify-note"
                name="note"
                bind:value={verifyNote}
                placeholder="e.g. I drive KBZ 123A on the Thika Road route, employee ID #4521"
                rows="3"
                class="sub-textarea"
              ></textarea>
            </div>

            <!-- Identity summary -->
            <div class="sub-identity-summary">
              <div class="sub-id-row">
                <span class="sub-id-label">Profile</span>
                <span class="sub-id-value">{data.profile?.full_name || 'Unknown'}</span>
              </div>
              <div class="sub-id-row">
                <span class="sub-id-label">Organization</span>
                <span class="sub-id-value">{data.org.name}</span>
              </div>
              {#if selectedRole}
                <div class="sub-id-row">
                  <span class="sub-id-label">Requested Role</span>
                  <span class="sub-id-value sub-id-accent">{roleLabel(selectedRole)}</span>
                </div>
              {/if}
            </div>

            <button type="submit" class="sub-btn-verify" disabled={isSubmitting || !selectedRole}>
              {#if isSubmitting}
                <span class="sub-spinner"></span>
                Submitting…
              {:else}
                <Fingerprint size={16} strokeWidth={2.5} />
                Submit Verification Request
              {/if}
            </button>
          </form>
        {/if}
      </div>
    {/if}

  </div>
</div>

<style>
  /* ── Foundation ── */
  .sub-root {
    --accent: #f97316;
    --accent-soft: rgba(249, 115, 22, 0.08);
    --accent-border: rgba(249, 115, 22, 0.18);
    --accent-glow: rgba(249, 115, 22, 0.25);
    --verify: #6366f1;
    --verify-soft: rgba(99, 102, 241, 0.08);
    --verify-border: rgba(99, 102, 241, 0.18);
    --verify-glow: rgba(99, 102, 241, 0.25);
    --green: #34d399;
    --surface: #0c0e13;
    --raised: rgba(255, 255, 255, 0.025);
    --border: rgba(255, 255, 255, 0.06);
    --t1: #f0f1f4;
    --t2: #c8cbd3;
    --t3: #6b7084;
    --t4: #44475a;

    position: relative; min-height: 100vh; background: var(--surface);
    color: #e2e4e9; overflow: hidden;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .sub-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .sub-bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
  .sub-bg-orb-1 { top: -10%; right: 10%; width: 500px; height: 500px; background: rgba(249,115,22,0.04); animation: orb-drift 14s ease-in-out infinite alternate; }
  .sub-bg-orb-2 { bottom: 10%; left: -5%; width: 400px; height: 400px; background: rgba(99,102,241,0.03); animation: orb-drift 18s ease-in-out infinite alternate-reverse; }
  @keyframes orb-drift { 0% { transform: translate(0,0); } 100% { transform: translate(25px,-20px); } }
  .sub-bg-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%);
  }

  .sub-container { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }

  /* ── Org Header ── */
  .sub-org-header { margin-bottom: 1.5rem; animation: fade-up 0.5s ease-out both; }
  @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .sub-org-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .sub-org-icon {
    display: flex; align-items: center; justify-content: center;
    width: 52px; height: 52px; border-radius: 15px;
    background: linear-gradient(135deg, var(--accent-soft), rgba(249,115,22,0.03));
    border: 1px solid var(--accent-border); color: var(--accent); flex-shrink: 0;
  }
  .sub-org-name {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 1.75rem; font-weight: 400; color: var(--t1); margin: 0; line-height: 1.15;
  }
  .sub-org-meta { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.15rem; }
  .sub-org-status {
    font-size: 0.7rem; font-weight: 600; text-transform: capitalize;
    padding: 0.15rem 0.5rem; border-radius: 100px;
  }
  .sub-status-active { color: var(--green); background: rgba(52,211,153,0.08); }
  .sub-status-suspended { color: #f87171; background: rgba(248,113,113,0.08); }
  .sub-status-inactive { color: #8b8fa3; background: rgba(139,143,163,0.08); }
  .sub-org-slug { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--t4); }

  .sub-stats-bar {
    display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
    padding: 0.7rem 1rem; background: var(--raised); border: 1px solid var(--border);
    border-radius: 12px; margin-bottom: 0.75rem;
  }
  .sub-stat-item { display: flex; align-items: center; gap: 0.35rem; color: var(--t4); }
  .sub-stat-val { font-size: 0.9rem; font-weight: 700; color: var(--t1); }
  .sub-stat-lbl { font-size: 0.72rem; color: var(--t4); }
  .sub-stat-sep { width: 1px; height: 16px; background: var(--border); }

  .sub-membership-badge {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 0.9rem; background: rgba(52,211,153,0.06);
    border: 1px solid rgba(52,211,153,0.12); border-radius: 10px;
    font-size: 0.82rem; color: var(--green);
  }
  .sub-membership-badge strong { color: #6ee7a0; }

  /* ── Tabs ── */
  .sub-tabs {
    display: flex; gap: 0.35rem; margin-bottom: 1.25rem;
    padding: 0.3rem; background: var(--raised); border: 1px solid var(--border);
    border-radius: 14px; animation: fade-up 0.5s ease-out both;
  }
  .sub-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.45rem;
    padding: 0.6rem 0.75rem; font-size: 0.82rem; font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    color: var(--t3); background: none; border: none; border-radius: 11px;
    cursor: pointer; transition: all 0.2s ease; position: relative;
  }
  .sub-tab:hover { color: var(--t2); }
  .sub-tab-active {
    color: var(--t1); background: rgba(255,255,255,0.05);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .sub-tab-badge {
    font-size: 0.62rem; font-weight: 600; text-transform: uppercase;
    color: #fbbf24; background: rgba(251,191,36,0.1);
    padding: 0.1rem 0.4rem; border-radius: 4px; letter-spacing: 0.04em;
  }

  /* ── Panel ── */
  .sub-panel {
    background: var(--raised); border: 1px solid var(--border);
    border-radius: 20px; padding: 1.75rem; animation: fade-up 0.45s ease-out both;
  }
  .sub-panel-header { margin-bottom: 1.5rem; }
  .sub-panel-title {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 1.3rem; font-weight: 400; color: var(--t1); margin: 0 0 0.35rem;
  }
  .sub-panel-desc { font-size: 0.85rem; line-height: 1.6; color: var(--t3); margin: 0; }
  .sub-panel-desc strong { color: var(--t2); font-weight: 600; }

  /* ── Route list ── */
  .sub-route-controls {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .sub-select-all {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.8rem; color: var(--t3); background: none; border: none;
    cursor: pointer; font-family: inherit; padding: 0;
    transition: color 0.15s ease;
  }
  .sub-select-all:hover { color: var(--t2); }
  .sub-route-count { font-size: 0.75rem; color: var(--t4); }

  .sub-checkbox {
    width: 18px; height: 18px; border-radius: 6px;
    border: 1.5px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.02);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease; flex-shrink: 0; color: transparent;
  }
  .sub-checked { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }

  .sub-route-list { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
  .sub-route-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.85rem; border-radius: 12px;
    background: none; border: 1px solid transparent;
    cursor: pointer; text-align: left; width: 100%;
    font-family: inherit; color: inherit;
    transition: all 0.15s ease; animation: fade-up 0.35s ease-out both;
  }
  .sub-route-item:hover { background: rgba(255,255,255,0.02); border-color: var(--border); }
  .sub-route-selected { background: rgba(249,115,22,0.03); border-color: var(--accent-border); }

  .sub-route-info { flex: 1; min-width: 0; }
  .sub-route-name { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; font-weight: 600; color: var(--t1); margin-bottom: 0.15rem; }
  .sub-route-detail { font-size: 0.78rem; color: var(--t3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub-route-time { font-size: 0.68rem; color: var(--t4); font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }

  .sub-empty-routes {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    padding: 2.5rem 1.5rem; text-align: center; color: var(--t4);
  }
  .sub-empty-routes p { font-size: 0.85rem; line-height: 1.6; margin: 0; max-width: 320px; }

  /* ── Vehicles ── */
  .sub-vehicles-toggle {
    display: flex; align-items: center; gap: 0.45rem;
    font-size: 0.78rem; color: var(--t3); background: none; border: none;
    cursor: pointer; font-family: inherit; padding: 0.5rem 0;
    transition: color 0.15s ease; margin-bottom: 0.5rem;
  }
  .sub-vehicles-toggle:hover { color: var(--t2); }

  .sub-vehicles-grid {
    display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem;
    padding: 0.75rem; background: rgba(255,255,255,0.015); border-radius: 12px;
    border: 1px solid var(--border);
  }
  .sub-vehicle-chip {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.72rem; padding: 0.25rem 0.55rem;
    background: rgba(255,255,255,0.02); border: 1px solid var(--border);
    border-radius: 6px;
  }
  .sub-vehicle-reg { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: var(--t2); }
  .sub-vehicle-cap { color: var(--t4); }
  .sub-vehicle-dot { width: 5px; height: 5px; border-radius: 50%; }
  .sub-vdot-on { background: var(--green); }
  .sub-vdot-off { background: #555a6e; }

  /* ── Action bar ── */
  .sub-action-bar { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
  .sub-btn-subscribe {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    width: 100%; padding: 0.75rem 1.25rem;
    font-size: 0.9rem; font-weight: 600; font-family: inherit;
    color: #fff; background: linear-gradient(135deg, #f97316, #ea580c);
    border: none; border-radius: 12px; cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.2s ease;
  }
  .sub-btn-subscribe:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px var(--accent-glow); }
  .sub-btn-subscribe:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Verify tab ── */
  .sub-how-it-works {
    display: flex; align-items: flex-start; gap: 0; margin-bottom: 1.5rem;
    padding: 1rem; background: rgba(99,102,241,0.03);
    border: 1px solid var(--verify-border); border-radius: 14px;
  }
  .sub-step { display: flex; align-items: flex-start; gap: 0.6rem; flex: 1; }
  .sub-step-num {
    width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 700;
    background: var(--verify-soft); color: var(--verify); border: 1px solid var(--verify-border);
    flex-shrink: 0;
  }
  .sub-step-text { display: flex; flex-direction: column; gap: 0.1rem; }
  .sub-step-text strong { font-size: 0.8rem; color: var(--t2); }
  .sub-step-text span { font-size: 0.72rem; color: var(--t4); line-height: 1.45; }
  .sub-step-connector {
    width: 24px; min-width: 16px; height: 1px; background: var(--verify-border);
    align-self: center; margin: 0 0.25rem; flex-shrink: 0;
  }

  .sub-verify-form { display: flex; flex-direction: column; gap: 1rem; }
  .sub-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .sub-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--t3); }
  .sub-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--t4); }

  .sub-role-grid { display: flex; flex-direction: column; gap: 0.35rem; }
  .sub-role-option {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.85rem; border-radius: 12px;
    border: 1px solid var(--border); background: none;
    cursor: pointer; transition: all 0.15s ease;
  }
  .sub-role-option:hover { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.1); }
  .sub-role-selected { background: var(--verify-soft); border-color: var(--verify-border); }
  .sub-role-radio { display: none; }
  .sub-role-content { flex: 1; min-width: 0; }
  .sub-role-name { display: block; font-size: 0.88rem; font-weight: 600; color: var(--t1); }
  .sub-role-desc { display: block; font-size: 0.75rem; color: var(--t4); margin-top: 0.1rem; }
  .sub-role-check { width: 20px; color: var(--verify); flex-shrink: 0; }

  .sub-textarea {
    width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 12px; padding: 0.7rem 0.95rem; font-size: 0.85rem;
    color: var(--t2); font-family: inherit; outline: none; resize: vertical;
    transition: border-color 0.15s ease; box-sizing: border-box; min-height: 80px;
  }
  .sub-textarea::placeholder { color: var(--t4); }
  .sub-textarea:focus { border-color: var(--verify-border); box-shadow: 0 0 0 3px var(--verify-soft); }

  .sub-identity-summary {
    padding: 0.85rem 1rem; background: rgba(255,255,255,0.015);
    border: 1px solid var(--border); border-radius: 12px;
    display: flex; flex-direction: column; gap: 0.4rem;
  }
  .sub-id-row { display: flex; justify-content: space-between; align-items: center; }
  .sub-id-label { font-size: 0.72rem; color: var(--t4); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
  .sub-id-value { font-size: 0.82rem; color: var(--t2); font-weight: 500; }
  .sub-id-accent { color: var(--verify); }

  .sub-btn-verify {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    width: 100%; padding: 0.75rem 1.25rem;
    font-size: 0.9rem; font-weight: 600; font-family: inherit;
    color: #fff; background: linear-gradient(135deg, #818cf8, #6366f1);
    border: none; border-radius: 12px; cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.2s ease;
  }
  .sub-btn-verify:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px var(--verify-glow); }
  .sub-btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Success / Pending / Verified states ── */
  .sub-success-state, .sub-pending-state, .sub-verified-state {
    text-align: center; padding: 2rem 1rem;
    animation: state-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes state-pop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  .sub-success-ring {
    display: inline-flex; align-items: center; justify-content: center;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    border: 1px solid var(--accent-border); margin-bottom: 1rem;
  }
  .sub-success-verify { background: var(--verify-soft); color: var(--verify); border-color: var(--verify-border); }
  .sub-success-h {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 1.5rem; font-weight: 400; color: var(--t1); margin: 0 0 0.5rem;
  }
  .sub-success-p { font-size: 0.88rem; line-height: 1.6; color: var(--t3); margin: 0; max-width: 380px; display: inline-block; }
  .sub-success-p strong { color: var(--t2); font-weight: 600; }

  .sub-pending-icon { color: #fbbf24; margin-bottom: 1rem; }
  .sub-pending-h { font-family: 'Instrument Serif', Georgia, serif; font-size: 1.35rem; color: var(--t1); margin: 0 0 0.5rem; }
  .sub-pending-p { font-size: 0.85rem; line-height: 1.6; color: var(--t3); margin: 0 0 1rem; }
  .sub-pending-p strong { color: #fbbf24; font-weight: 600; }
  .sub-pending-detail { display: inline-flex; align-items: center; gap: 0.5rem; }
  .sub-pending-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--t4); font-weight: 600; }
  .sub-pending-code {
    font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--t4);
    background: rgba(255,255,255,0.03); padding: 0.2rem 0.5rem; border-radius: 6px;
    border: 1px solid var(--border);
  }

  .sub-verified-icon { color: var(--green); margin-bottom: 1rem; }
  .sub-verified-h { font-family: 'Instrument Serif', Georgia, serif; font-size: 1.35rem; color: var(--t1); margin: 0 0 0.5rem; }
  .sub-verified-p { font-size: 0.85rem; line-height: 1.6; color: var(--t3); margin: 0 0 1rem; }
  .sub-verified-p strong { color: var(--green); }

  .sub-actor-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; }
  .sub-actor-chip {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem;
    border-radius: 6px; text-transform: capitalize;
  }
  .sub-actor-badge { font-weight: 400; opacity: 0.7; }
  .sub-actor-driver { color: #60a5fa; background: rgba(96,165,250,0.1); }
  .sub-actor-conductor { color: #a78bfa; background: rgba(167,139,250,0.1); }
  .sub-actor-fleet_owner { color: var(--green); background: rgba(52,211,153,0.1); }
  .sub-actor-passenger { color: #fbbf24; background: rgba(251,191,36,0.1); }
  .sub-actor-stage_operator { color: #f472b6; background: rgba(244,114,182,0.1); }

  /* ── Error ── */
  .sub-error {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.7rem 1rem; background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.15); border-radius: 10px;
    color: #f87171; font-size: 0.82rem; margin-bottom: 1rem;
  }

  /* ── Shared ── */
  .sub-spinner {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .sub-slide-in { animation: fade-up 0.4s ease-out both; }

  @media (max-width: 600px) {
    .sub-container { padding: 1.25rem 0.85rem 2.5rem; }
    .sub-org-name { font-size: 1.4rem; }
    .sub-stats-bar { gap: 0.5rem; }
    .sub-panel { padding: 1.25rem; }
    .sub-how-it-works { flex-direction: column; gap: 0.5rem; }
    .sub-step-connector { width: 1px; height: 12px; align-self: flex-start; margin: 0 0 0 12px; }
  }
</style>