<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"
  import { authStore } from "$lib/features/auth/stores/auth"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  // ── Types ──────────────────────────────────────────────────────────────────
  type IncidentStatus = "open" | "pending" | "resolved" | "escalated"
  type IncidentSeverity = "low" | "medium" | "high" | "critical"

  interface Incident {
    id: string
    type: string
    category: string
    route: string
    vehicle: string
    location: string
    time: string
    date: string
    status: IncidentStatus
    severity: IncidentSeverity
    description: string
    updateCount: number
    isNew?: boolean
  }

  // ── Mock data ──────────────────────────────────────────────────────────────
  let incidents = $state<Incident[]>([
    {
      id: "INC-2024-001",
      type: "Passenger Dispute",
      category: "passenger",
      route: "58 Buru Buru → CBD",
      vehicle: "KCA 812G",
      location: "Near Kencom Stage",
      time: "09:14",
      date: "Today",
      status: "open",
      severity: "medium",
      description:
        "Passenger refused to pay the full fare and became verbally aggressive when asked to disembark. Several other passengers witnessed the altercation near Kencom.",
      updateCount: 2,
      isNew: true,
    },
    {
      id: "INC-2024-002",
      type: "Vehicle Breakdown",
      category: "mechanical",
      route: "23 Ngong Rd → CBD",
      vehicle: "KBZ 045T",
      location: "Ngong Rd, near Prestige Plaza",
      time: "07:55",
      date: "Yesterday",
      status: "resolved",
      severity: "high",
      description:
        "Right front tyre blowout at speed. Vehicle was safely pulled to the roadside. No passenger injuries reported. Recovery vehicle was dispatched.",
      updateCount: 4,
    },
    {
      id: "INC-2024-003",
      type: "Fare Discrepancy",
      category: "financial",
      route: "46 Rongai → CBD",
      vehicle: "KDA 317F",
      location: "Rongai Stage",
      time: "15:30",
      date: "Mon",
      status: "pending",
      severity: "low",
      description:
        "Cashless payment system double-charged two passengers. Both provided M-Pesa confirmation screenshots showing duplicate transactions.",
      updateCount: 2,
    },
    {
      id: "INC-2024-004",
      type: "Road Accident",
      category: "safety",
      route: "12 Eastleigh → City Hall",
      vehicle: "KCE 501M",
      location: "Moi Avenue / Haile Selassie Jctn",
      time: "11:42",
      date: "Mon",
      status: "escalated",
      severity: "critical",
      description:
        "Side-swipe collision with a private vehicle at the junction. Minor body damage only — no passenger injuries. Police report filed: OB 045/2024.",
      updateCount: 4,
    },
    {
      id: "INC-2024-005",
      type: "Overloading Report",
      category: "safety",
      route: "58 Buru Buru → CBD",
      vehicle: "KCA 812G",
      location: "Buru Buru Stage",
      time: "06:30",
      date: "Sun",
      status: "resolved",
      severity: "medium",
      description:
        "Vehicle was flagged by NTSA officers for carrying passengers beyond licensed capacity. Fine issued, passengers offloaded safely.",
      updateCount: 3,
    },
    {
      id: "INC-2024-006",
      type: "Harassment Complaint",
      category: "passenger",
      route: "46 Rongai → CBD",
      vehicle: "KDA 317F",
      location: "Lang'ata Rd, near Junction Mall",
      time: "18:55",
      date: "Sun",
      status: "pending",
      severity: "high",
      description:
        "Female passenger lodged a formal complaint against the conductor regarding inappropriate comments. Passenger provided contact details for follow-up.",
      updateCount: 1,
    },
  ])

  // ── View state ─────────────────────────────────────────────────────────────
  let filterStatus = $state<IncidentStatus | "all">("all")
  let filterCat = $state<string>("all")
  let showForm = $state(false)
  let submitting = $state(false)
  let submitDone = $state(false)

  let filtered = $derived(
    incidents.filter((i) => {
      const okStatus = filterStatus === "all" || i.status === filterStatus
      const okCat = filterCat === "all" || i.category === filterCat
      return okStatus && okCat
    }),
  )

  // ── Report form ────────────────────────────────────────────────────────────
  let form = $state({
    type: "",
    category: "passenger",
    route: "",
    vehicle: "",
    location: "",
    severity: "medium" as IncidentSeverity,
    description: "",
  })
  let formErrors = $state<Record<string, string>>({})

  function validateForm(): boolean {
    const e: Record<string, string> = {}
    if (!form.type.trim()) e.type = "Incident type is required"
    if (!form.route.trim()) e.route = "Route is required"
    if (!form.location.trim()) e.location = "Location is required"
    if (form.description.trim().length < 20)
      e.description = "Please add more detail (min 20 chars)"
    formErrors = e
    return Object.keys(e).length === 0
  }

  async function submitReport() {
    if (!validateForm()) return
    submitting = true
    await new Promise((r) => setTimeout(r, 1100))
    const newId = `INC-2024-00${incidents.length + 1}`
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    incidents = [
      {
        id: newId,
        type: form.type,
        category: form.category,
        route: form.route,
        vehicle: form.vehicle || "—",
        location: form.location,
        time: now,
        date: "Today",
        status: "open",
        severity: form.severity,
        isNew: true,
        description: form.description,
        updateCount: 1,
      },
      ...incidents,
    ]
    submitting = false
    submitDone = true
    form = {
      type: "",
      category: "passenger",
      route: "",
      vehicle: "",
      location: "",
      severity: "medium",
      description: "",
    }
    setTimeout(() => {
      submitDone = false
      showForm = false
    }, 1800)
  }

  // ── Config ─────────────────────────────────────────────────────────────────
  const STATUS_CFG: Record<
    IncidentStatus,
    { color: string; bg: string; border: string; label: string }
  > = {
    open: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
      label: "Open",
    },
    pending: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.22)",
      label: "Pending",
    },
    resolved: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.1)",
      border: "rgba(74,222,128,0.22)",
      label: "Resolved",
    },
    escalated: {
      color: "#fb923c",
      bg: "rgba(251,146,60,0.1)",
      border: "rgba(251,146,60,0.22)",
      label: "Escalated",
    },
  }
  const SEV_CFG: Record<IncidentSeverity, { color: string; dot: string }> = {
    low: { color: "rgba(255,255,255,0.4)", dot: "rgba(255,255,255,0.22)" },
    medium: { color: "#facc15", dot: "#facc15" },
    high: { color: "#fb923c", dot: "#fb923c" },
    critical: { color: "#f87171", dot: "#f87171" },
  }
  const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "passenger", label: "Passenger" },
    { id: "mechanical", label: "Mechanical" },
    { id: "financial", label: "Financial" },
    { id: "safety", label: "Safety" },
  ]
  const CAT_ICONS: Record<string, string> = {
    passenger: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    mechanical: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>`,
    financial: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    safety: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  let pendingTips = $state(3)
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      badge: () => 0,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/incidents",
      badge: () => incidents.filter((i) => i.status === "open").length,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/tipjar",
      badge: () => pendingTips,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]
  function isActive(href: string) {
    return href === "/incidents"
      ? currentPath.startsWith("/incidents")
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

<svelte:head><title>Incidents — Matatu Pulse</title></svelte:head>

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

<!-- Report modal -->
{#if showForm}
  <div class="modal-backdrop" onclick={() => (showForm = false)}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-hd">
        <div>
          <div class="modal-title">Report an Incident</div>
          <div class="modal-sub">
            Sent immediately to dispatch and management.
          </div>
        </div>
        <button class="modal-close" onclick={() => (showForm = false)}>✕</button
        >
      </div>
      <div class="modal-body">
        <div class="field">
          <span class="field-label">Category</span>
          <div class="cat-opts">
            {#each CATEGORIES.filter((c) => c.id !== "all") as cat}
              <button
                class="cat-opt {form.category === cat.id ? 'sel' : ''}"
                onclick={() => (form.category = cat.id)}
              >
                {@html CAT_ICONS[cat.id]}{cat.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="f-type">Incident Type</label>
          <input
            id="f-type"
            class="field-input {formErrors.type ? 'err' : ''}"
            placeholder="e.g. Passenger dispute, Tyre blowout…"
            bind:value={form.type}
          />
          {#if formErrors.type}<span class="field-err">{formErrors.type}</span
            >{/if}
        </div>
        <div class="two-fields">
          <div class="field">
            <label class="field-label" for="f-route">Route</label>
            <input
              id="f-route"
              class="field-input {formErrors.route ? 'err' : ''}"
              placeholder="e.g. 58 Buru → CBD"
              bind:value={form.route}
            />
            {#if formErrors.route}<span class="field-err"
                >{formErrors.route}</span
              >{/if}
          </div>
          <div class="field">
            <label class="field-label" for="f-veh">Vehicle Plate</label>
            <input
              id="f-veh"
              class="field-input"
              placeholder="e.g. KCA 812G"
              bind:value={form.vehicle}
            />
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="f-loc">Exact Location</label>
          <input
            id="f-loc"
            class="field-input {formErrors.location ? 'err' : ''}"
            placeholder="e.g. Near Kencom Stage"
            bind:value={form.location}
          />
          {#if formErrors.location}<span class="field-err"
              >{formErrors.location}</span
            >{/if}
        </div>
        <div class="field">
          <span class="field-label">Severity</span>
          <div class="sev-opts">
            {#each ["low", "medium", "high", "critical"] as IncidentSeverity[] as sev}
              {@const cfg = SEV_CFG[sev]}
              <button
                class="sev-opt"
                style="border-color:{form.severity === sev
                  ? cfg.dot
                  : 'rgba(255,255,255,0.08)'};background:{form.severity === sev
                  ? 'color-mix(in srgb,' + cfg.dot + ' 10%,transparent)'
                  : 'rgba(255,255,255,0.03)'}"
                onclick={() => (form.severity = sev)}
              >
                <div class="sev-dot-sm" style="background:{cfg.dot}"></div>
                <div
                  class="sev-label"
                  style="color:{form.severity === sev
                    ? cfg.color
                    : 'var(--text-3)'}"
                >
                  {sev}
                </div>
              </button>
            {/each}
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="f-desc"
            >Description <span
              style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-3)"
              >· {form.description.length} chars</span
            ></label
          >
          <textarea
            id="f-desc"
            class="field-textarea {formErrors.description ? 'err' : ''}"
            placeholder="Describe what happened in detail…"
            bind:value={form.description}
          ></textarea>
          {#if formErrors.description}<span class="field-err"
              >{formErrors.description}</span
            >{/if}
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn-cancel" onclick={() => (showForm = false)}
          >Cancel</button
        >
        <button
          class="btn-submit {submitDone ? 'done' : ''}"
          onclick={submitReport}
          disabled={submitting || submitDone}
        >
          {#if submitting}<span
              class="spinner"
              style="width:13px;height:13px;border-width:2px;border-top-color:#f87171"
            ></span>Submitting…
          {:else if submitDone}<svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
            >Submitted!
          {:else}<svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              ><path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              /></svg
            >Submit Report{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

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
          <a href="/dashboard">Dashboard</a><span class="bc-sep">›</span><span
            class="bc-cur">Incidents</span
          >
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      {#if loading}
        <div class="loading">
          <span class="spinner"></span>Loading incidents…
        </div>
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
                  d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                /></svg
              >Incident Management
            </div>
            <h1 class="page-title">Your <em>Incidents</em></h1>
            <p class="page-sub">
              Report issues and track responses from dispatch. Click any
              incident for full details.
            </p>
          </div>
          <button class="report-btn" onclick={() => (showForm = true)}>
            <svg
              width="13"
              height="13"
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
            Report New Incident
          </button>
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
                stroke-width="2"><circle cx="12" cy="12" r="10" /></svg
              >Total
            </div>
            <div class="kpi-val">{incidents.length}</div>
            <div class="kpi-meta">All time</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:#f87171">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><circle cx="12" cy="12" r="10" /></svg
              >Open
            </div>
            <div class="kpi-val" style="color:#f87171">
              {incidents.filter((i) => i.status === "open").length}
            </div>
            <div class="kpi-meta">Needs attention</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:#facc15">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><circle cx="12" cy="12" r="10" /></svg
              >Pending
            </div>
            <div class="kpi-val" style="color:#facc15">
              {incidents.filter((i) => i.status === "pending").length}
            </div>
            <div class="kpi-meta">In review</div>
          </div>
          <div class="kpi">
            <div class="kpi-lbl" style="color:#4ade80">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><circle cx="12" cy="12" r="10" /></svg
              >Resolved
            </div>
            <div class="kpi-val" style="color:#4ade80">
              {incidents.filter((i) => i.status === "resolved").length}
            </div>
            <div class="kpi-meta">This month</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-row">
          {#each CATEGORIES as cat}
            <button
              class="filter-chip {filterCat === cat.id ? 'active' : ''}"
              onclick={() => (filterCat = cat.id)}
            >
              {#if cat.id !== "all"}{@html CAT_ICONS[cat.id]}{/if}{cat.label}
            </button>
          {/each}
          <div class="status-filters">
            {#each ["open", "pending", "resolved", "escalated"] as IncidentStatus[] as st}
              {@const s = STATUS_CFG[st]}
              <button
                class="s-chip {filterStatus === st ? 's-active' : ''}"
                style="color:{s.color};background:{s.bg};border-color:{s.border}"
                onclick={() => {
                  filterStatus = filterStatus === st ? "all" : st
                }}>{s.label}</button
              >
            {/each}
          </div>
        </div>

        <!-- Card list -->
        {#if filtered.length === 0}
          <div class="empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              ><path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              /><line x1="12" y1="9" x2="12" y2="13" /><line
                x1="12"
                y1="17"
                x2="12.01"
                y2="17"
              /></svg
            >
            <div class="empty-title">No incidents found</div>
            <div class="empty-sub">
              Adjust your filters or report a new incident.
            </div>
          </div>
        {:else}
          <div class="inc-grid">
            {#each filtered as inc}
              {@const s = STATUS_CFG[inc.status]}
              {@const sv = SEV_CFG[inc.severity]}
              <a href="/incidents/{inc.id}" class="inc-card sev-{inc.severity}">
                <div class="card-top">
                  <span class="inc-id">{inc.id}</span>
                  <span class="inc-type">{inc.type}</span>
                  {#if inc.isNew}<span class="new-badge">New</span>{/if}
                  <span
                    class="s-pill"
                    style="color:{s.color};background:{s.bg};border:1px solid {s.border}"
                    >{s.label}</span
                  >
                </div>
                <div class="card-meta">
                  <div class="meta-item">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><rect x="1" y="3" width="15" height="13" /><path
                        d="M16 8h4l3 3v5h-7z"
                      /></svg
                    >{inc.route}
                  </div>
                  <div class="meta-item">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                      /><circle cx="12" cy="10" r="3" /></svg
                    >{inc.location}
                  </div>
                  <div class="meta-item">
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
                    >{inc.date} · {inc.time}
                  </div>
                  <div class="meta-item">
                    <span class="sev-dot" style="background:{sv.dot}"
                    ></span>{inc.severity}
                  </div>
                </div>
                <div class="card-desc">{inc.description}</div>
                <div class="card-footer">
                  <div class="upd-count">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><path
                        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      /></svg
                    >{inc.updateCount} update{inc.updateCount !== 1 ? "s" : ""}
                  </div>
                  <div class="view-link">
                    View details <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="9 18 15 12 9 6" /></svg
                    >
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Shell / Sidebar (shared pattern) ─────────────────────────────────── */
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

  /* ── Page ─────────────────────────────────────────────────────────────── */
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
  .report-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    border-radius: 11px;
    font-size: 0.82rem;
    font-weight: 700;
    color: #f87171;
    cursor: pointer;
    font-family: var(--font-body);
    transition:
      background 0.15s,
      transform 0.15s;
  }
  .report-btn:hover {
    background: rgba(248, 113, 113, 0.18);
    transform: translateY(-1px);
  }

  /* ── KPI strip ── */
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

  /* ── Filters ── */
  .filters-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
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
  .filter-chip :global(svg) {
    opacity: 0.7;
  }
  .status-filters {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .s-chip {
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid transparent;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .s-chip:not(.s-active) {
    opacity: 0.4;
  }
  .s-chip.s-active {
    opacity: 1;
  }

  /* ── Incident cards ── */
  .inc-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .inc-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 18px 20px 16px 24px;
    cursor: pointer;
    text-decoration: none;
    display: block;
    position: relative;
    transition:
      background 0.15s,
      border-color 0.15s,
      transform 0.15s;
  }
  .inc-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(255, 255, 255, 0.08);
    transition: background 0.15s;
  }
  .inc-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateX(3px);
  }
  .inc-card.sev-critical::before {
    background: #f87171;
  }
  .inc-card.sev-high::before {
    background: #fb923c;
  }
  .inc-card.sev-medium::before {
    background: #facc15;
  }
  .inc-card.sev-low::before {
    background: rgba(255, 255, 255, 0.18);
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .inc-id {
    font-size: 0.6rem;
    font-weight: 800;
    font-family: monospace;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2px 7px;
    border-radius: 5px;
    white-space: nowrap;
  }
  .inc-type {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    flex: 1;
    min-width: 0;
  }
  .new-badge {
    font-size: 0.55rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.25);
    padding: 2px 6px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .s-pill {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
    white-space: nowrap;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .meta-item :global(svg) {
    opacity: 0.6;
    flex-shrink: 0;
  }
  .sev-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .card-desc {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .upd-count {
    font-size: 0.65rem;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .view-link {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--orange);
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .inc-card:hover .view-link {
    opacity: 1;
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
    margin-bottom: 6px;
  }
  .empty-sub {
    font-size: 0.8rem;
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
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Report modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--ink-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
  }
  .modal-hd {
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    position: sticky;
    top: 0;
    background: var(--ink-2);
    z-index: 1;
  }
  .modal-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .modal-sub {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 3px;
  }
  .modal-close {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    color: var(--text-3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
    font-size: 0.85rem;
  }
  .modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-1);
  }
  .modal-body {
    padding: 20px 24px;
  }
  .modal-ft {
    padding: 12px 24px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  .field {
    margin-bottom: 16px;
  }
  .field-label {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 7px;
    display: block;
  }
  .field-input,
  .field-textarea {
    width: 100%;
    padding: 10px 13px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--text-1);
    transition:
      border-color 0.15s,
      background 0.15s;
    box-sizing: border-box;
  }
  .field-input:focus,
  .field-textarea:focus {
    outline: none;
    border-color: rgba(0, 176, 155, 0.4);
    background: rgba(255, 255, 255, 0.06);
  }
  .field-input.err,
  .field-textarea.err {
    border-color: rgba(248, 113, 113, 0.45);
  }
  .field-textarea {
    resize: vertical;
    min-height: 90px;
    line-height: 1.6;
  }
  .field-err {
    font-size: 0.66rem;
    color: #f87171;
    margin-top: 4px;
    display: block;
  }
  .two-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .cat-opts {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }
  .cat-opt {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border-radius: 9px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.03);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .cat-opt:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-2);
  }
  .cat-opt.sel {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }
  .cat-opt :global(svg) {
    opacity: 0.7;
  }
  .sev-opts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .sev-opt {
    padding: 8px 6px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .sev-dot-sm {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin: 0 auto 5px;
  }
  .sev-label {
    font-size: 0.63rem;
    font-weight: 700;
    text-transform: capitalize;
  }
  .btn-cancel {
    padding: 9px 18px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.09);
  }
  .btn-submit {
    padding: 9px 22px;
    border-radius: 10px;
    background: rgba(248, 113, 113, 0.14);
    border: 1px solid rgba(248, 113, 113, 0.32);
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: #f87171;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.15s;
  }
  .btn-submit:hover:not(:disabled) {
    background: rgba(248, 113, 113, 0.22);
    transform: translateY(-1px);
  }
  .btn-submit:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .btn-submit.done {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
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
    .two-fields,
    .sev-opts {
      grid-template-columns: 1fr 1fr;
    }
    .status-filters {
      margin-left: 0;
    }
  }
</style>
