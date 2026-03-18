<script lang="ts">
  /**
   * /admin/+page.svelte — sxcntqnt Platform Admin Dashboard
   *
   * FIXES FROM PREVIOUS VERSION:
   *
   *   BUG 1 — All mock data:
   *     Every KPI, table row, and audit entry was hardcoded.
   *     Now reads from load() which queries the actual DB.
   *
   *   BUG 2 — approveReq() / rejectReq() were client-side only:
   *     Mutations never hit the DB. Now POST to ?/approve_request
   *     and ?/reject_request server actions.
   *
   *   BUG 3 — Wrong store import path:
   *     '$lib/features/auth/stores/auth' → '$lib/features/auth/stores/auth.store'
   *
   *   BUG 4 — authStore is @deprecated:
   *     Now uses sessionStore directly.
   *
   *   BUG 5 — Wrong product name:
   *     'Matatu Pulse' / 'MatatuPL' → 'sxcntqnt'
   */

  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { enhance } from "$app/forms"
  import { sessionStore } from "$lib/features/auth/stores/auth.store"

  // ── Props from load() ──────────────────────────────────────────
  type OrgSummary = {
    id: string
    name: string
    status: string
    memberCount: number
    vehicleCount: number
    metadata: Record<string, unknown> | null
  }
  type Request = {
    id: string
    requested_type: string
    status: string
    payload: Record<string, unknown> | null
    created_at: string
    profiles: { full_name: string | null; avatar_url: string | null } | null
  }
  type AuditEntry = {
    id: string
    event_type: string
    severity: string
    performed_by: string | null
    created_at: string
    performer: { full_name: string | null } | null
  }
  type Data = {
    pendingRequestCount: number
    totalUserCount: number
    totalOrgCount: number
    totalJurisdictionCount: number
    criticalAuditCount: number
    recentRequests: Request[]
    recentAuditEntries: AuditEntry[]
    orgSummaries: OrgSummary[]
  }

  let { data }: { data: Data } = $props()

  // ── Auth store ─────────────────────────────────────────────────
  let profile = $derived($sessionStore.profile)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  // ── Helpers ────────────────────────────────────────────────────
  function initials(name?: string | null) {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function formatRequestLabel(r: Request): string {
    const role = (r.payload?.role_requested as string) ?? r.requested_type
    const org = (r.payload?.org_name as string) ?? ""
    return [role.replace(/_/g, " "), org].filter(Boolean).join(" · ")
  }

  // ── Status / severity colour maps ─────────────────────────────
  const REQ_STATUS: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    pending: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.09)",
      border: "rgba(250,204,21,0.22)",
    },
    approved: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.09)",
      border: "rgba(74,222,128,0.22)",
    },
    rejected: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.09)",
      border: "rgba(248,113,113,0.22)",
    },
  }

  const AUDIT_SEV: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    info: {
      color: "#9ca3af",
      bg: "rgba(156,163,175,0.07)",
      border: "rgba(156,163,175,0.14)",
    },
    warn: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.07)",
      border: "rgba(250,204,21,0.18)",
    },
    critical: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.10)",
      border: "rgba(248,113,113,0.22)",
    },
  }

  const ORG_STATUS: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    active: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.09)",
      border: "rgba(74,222,128,0.22)",
    },
    pending_activation: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.09)",
      border: "rgba(250,204,21,0.18)",
    },
    suspended: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.09)",
      border: "rgba(248,113,113,0.22)",
    },
    inactive: {
      color: "#6b7280",
      bg: "rgba(107,114,128,0.08)",
      border: "rgba(107,114,128,0.12)",
    },
  }

  // ── Nav ────────────────────────────────────────────────────────
  const homeItem = {
    key: "home",
    label: "Overview",
    href: "/admin",
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  }

  const navSections = [
    {
      label: "Access Control",
      items: [
        {
          key: "actor_requests",
          label: "Actor Requests",
          href: "/admin/actor_requests",
          badge: data.pendingRequestCount,
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        },
        {
          key: "users",
          label: "Users",
          href: "/admin/users",
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        },
      ],
    },
    {
      label: "Platform",
      items: [
        {
          key: "organizations",
          label: "Organizations",
          href: "/admin/organizations",
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
        },
        {
          key: "jurisdictions",
          label: "Jurisdictions",
          href: "/admin/jurisdictions",
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        },
      ],
    },
    {
      label: "Monitoring",
      items: [
        {
          key: "audit_logs",
          label: "Audit Logs",
          href: "/admin/audit_logs",
          badge:
            data.criticalAuditCount > 0 ? data.criticalAuditCount : undefined,
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        },
      ],
    },
  ]

  function isActive(href: string) {
    if (href === "/admin")
      return currentPath === "/admin" || currentPath === "/admin/dashboard"
    return currentPath.startsWith(href)
  }

  onMount(() => {
    if (browser) setTimeout(() => (loading = false), 200)
  })
</script>

<svelte:head><title>Admin — sxcntqnt</title></svelte:head>

<!-- Mobile overlay -->
<div
  class="m-overlay {mobileOpen ? 'open' : ''}"
  onclick={() => (mobileOpen = false)}
>
  <div class="m-panel" onclick={(e) => e.stopPropagation()}>
    <div class="m-head">
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="logo-mark">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span class="logo-text">sx<span>cntqnt</span></span>
      </div>
      <button class="close-x" onclick={() => (mobileOpen = false)}>✕</button>
    </div>
    <span class="role-badge" style="margin:14px 14px 0"
      ><span class="role-dot"></span>Super Admin</span
    >
    <div class="sb-nav" style="padding-top:8px">
      <a
        href="/admin"
        class="nav-link {isActive('/admin') ? 'active' : ''}"
        onclick={() => (mobileOpen = false)}
      >
        {@html homeItem.icon}{homeItem.label}
      </a>
      {#each navSections as section}
        <p class="sec-label">{section.label}</p>
        {#each section.items as item}
          <a
            href={item.href}
            class="nav-link {isActive(item.href) ? 'active' : ''}"
            onclick={() => (mobileOpen = false)}
          >
            {@html item.icon}{item.label}
            {#if "badge" in item && item.badge}<span class="nav-badge"
                >{item.badge}</span
              >{/if}
          </a>
        {/each}
      {/each}
    </div>
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
          stroke-width="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <span class="logo-text">sx<span>cntqnt</span></span>
    </div>

    <span class="role-badge"><span class="role-dot"></span>Super Admin</span>

    <nav class="sb-nav" style="padding-top:8px">
      <a href="/admin" class="nav-link {isActive('/admin') ? 'active' : ''}"
        >{@html homeItem.icon}{homeItem.label}</a
      >
      {#each navSections as section}
        <p class="sec-label">{section.label}</p>
        <div class="sb-section">
          {#each section.items as item}
            <a
              href={item.href}
              class="nav-link {isActive(item.href) ? 'active' : ''}"
            >
              {@html item.icon}{item.label}
              {#if "badge" in item && item.badge}<span class="nav-badge"
                  >{item.badge}</span
                >{/if}
            </a>
          {/each}
        </div>
      {/each}
    </nav>

    <div class="sb-footer">
      {#if profile}
        <div class="user-card">
          <div class="user-av">{initials(profile.full_name)}</div>
          <div>
            <div class="user-name">{profile.full_name ?? "Admin"}</div>
            <div class="user-role-lbl">Platform Admin</div>
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
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
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
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <nav class="breadcrumb">
          <a href="/">Home</a><span class="bc-sep">›</span>
          <a href="/admin">Admin</a>
          {#if currentPath !== "/admin"}
            <span class="bc-sep">›</span>
            <span class="bc-cur"
              >{navSections
                .flatMap((s) => s.items)
                .find((n) => isActive(n.href))?.label ?? ""}</span
            >
          {/if}
        </nav>
      </div>
      <div class="admin-pill"><span class="admin-dot"></span>Super Admin</div>
    </div>

    <div class="content">
      <div class="page-hd">
        <div class="eyebrow"><span class="live-dot"></span>Admin Panel</div>
        <h1 class="page-title">Platform <em>Control</em></h1>
        <p class="page-sub">
          System health, actor requests, and access management.
        </p>
      </div>

      {#if loading}
        <div class="loading">
          <span class="spinner"></span>Loading platform data…
        </div>
      {:else}
        <!-- KPIs — real data from load() -->
        <div class="kpi-strip">
          <div class="kpi">
            {#if data.pendingRequestCount > 0}<div class="alert-badge">
                {data.pendingRequestCount}
              </div>{/if}
            <div class="kpi-lbl">
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
              Pending Roles
            </div>
            <div
              class="kpi-val"
              style="color:{data.pendingRequestCount > 0
                ? '#facc15'
                : '#4ade80'}"
            >
              {data.pendingRequestCount}
            </div>
            <div class="kpi-meta">awaiting review</div>
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
                ><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle
                  cx="12"
                  cy="7"
                  r="4"
                /></svg
              >
              Users
            </div>
            <div class="kpi-val">{data.totalUserCount.toLocaleString()}</div>
            <div class="kpi-meta">registered profiles</div>
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
                ><rect x="2" y="7" width="20" height="14" rx="2" /><path
                  d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"
                /></svg
              >
              SACCOs
            </div>
            <div class="kpi-val">{data.totalOrgCount}</div>
            <div class="kpi-meta">organizations</div>
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
                ><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /></svg
              >
              Jurisdictions
            </div>
            <div class="kpi-val">{data.totalJurisdictionCount}</div>
            <div class="kpi-meta">assigned</div>
          </div>

          <div class="kpi">
            {#if data.criticalAuditCount > 0}<div class="alert-badge">
                {data.criticalAuditCount}
              </div>{/if}
            <div class="kpi-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                ><path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                /><polyline points="14 2 14 8 20 8" /></svg
              >
              Critical
            </div>
            <div
              class="kpi-val"
              style="color:{data.criticalAuditCount > 0
                ? '#f87171'
                : '#4ade80'}"
            >
              {data.criticalAuditCount}
            </div>
            <div class="kpi-meta">audit alerts (24h)</div>
          </div>
        </div>

        <!-- Actor Requests + Audit Log -->
        <div class="two-col">
          <!-- Actor Requests — real data + server actions -->
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">Pending Review</div>
                <div class="card-ti">Actor Requests</div>
              </div>
              <a href="/admin/actor_requests" class="link-sm">All requests →</a>
            </div>
            <div class="req-list">
              {#each data.recentRequests as r}
                {@const s = REQ_STATUS[r.status] ?? REQ_STATUS.pending}
                <div class="req-row">
                  <code class="req-id">{r.id.slice(0, 8)}</code>
                  <div class="req-info">
                    <div class="req-name">
                      {r.profiles?.full_name ?? "Unknown"}
                    </div>
                    <div class="req-meta">{formatRequestLabel(r)}</div>
                  </div>
                  <span
                    class="s-pill"
                    style="color:{s.color};background:{s.bg};border:1px solid {s.border}"
                    >{r.status}</span
                  >
                  <span class="req-time">{timeAgo(r.created_at)}</span>
                  {#if r.status === "pending"}
                    <div class="action-btns">
                      <!-- FIX: real server action, not client-side state -->
                      <form
                        method="post"
                        action="?/approve_request"
                        use:enhance
                        style="display:contents"
                      >
                        <input type="hidden" name="request_id" value={r.id} />
                        <button
                          type="submit"
                          class="act-btn btn-approve"
                          title="Approve"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            ><polyline points="20 6 9 17 4 12" /></svg
                          >
                        </button>
                      </form>
                      <form
                        method="post"
                        action="?/reject_request"
                        use:enhance
                        style="display:contents"
                      >
                        <input type="hidden" name="request_id" value={r.id} />
                        <button
                          type="submit"
                          class="act-btn btn-reject"
                          title="Reject"
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            ><line x1="18" y1="6" x2="6" y2="18" /><line
                              x1="6"
                              y1="6"
                              x2="18"
                              y2="18"
                            /></svg
                          >
                        </button>
                      </form>
                    </div>
                  {/if}
                </div>
              {/each}
              {#if data.recentRequests.length === 0}
                <div class="card-empty">No recent requests</div>
              {/if}
            </div>
          </div>

          <!-- Audit Log — real data -->
          <div class="card">
            <div class="card-hd">
              <div>
                <div class="card-ey">System Events</div>
                <div class="card-ti">Audit Log</div>
              </div>
              <a href="/admin/audit_logs" class="link-sm">Full log →</a>
            </div>
            <div class="audit-list">
              {#each data.recentAuditEntries as e}
                {@const sev = AUDIT_SEV[e.severity ?? "info"] ?? AUDIT_SEV.info}
                <div class="audit-row">
                  <div
                    class="audit-sev"
                    style="background:{sev.bg};border:1px solid {sev.border};color:{sev.color}"
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      {#if e.severity === "critical"}
                        <path
                          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                      {:else}
                        <circle cx="12" cy="12" r="10" />
                      {/if}
                    </svg>
                  </div>
                  <div class="audit-inf">
                    <div class="audit-action">{e.event_type}</div>
                    <div class="audit-detail">
                      {e.performer?.full_name ??
                        e.performed_by?.slice(0, 8) ??
                        "system"}
                    </div>
                  </div>
                  <span class="audit-time">{timeAgo(e.created_at)}</span>
                </div>
              {/each}
              {#if data.recentAuditEntries.length === 0}
                <div class="card-empty">No recent events</div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Organizations table — real data -->
        <div class="full-row card">
          <div class="card-hd">
            <div>
              <div class="card-ey">Registered</div>
              <div class="card-ti">Organizations</div>
            </div>
            <a href="/admin/organizations" class="link-sm">Manage →</a>
          </div>
          <div class="t-scroll">
            <table>
              <thead>
                <tr
                  ><th>SACCO</th><th>Members</th><th>Vehicles</th><th>Status</th
                  ></tr
                >
              </thead>
              <tbody>
                {#each data.orgSummaries as org}
                  {@const st = ORG_STATUS[org.status] ?? ORG_STATUS.inactive}
                  <tr>
                    <td><span class="org-name">{org.name}</span></td>
                    <td>{org.memberCount}</td>
                    <td>{org.vehicleCount}</td>
                    <td>
                      <span
                        class="s-pill"
                        style="color:{st.color};background:{st.bg};border:1px solid {st.border}"
                      >
                        {org.status === "pending_activation"
                          ? "pending"
                          : org.status}
                      </span>
                    </td>
                  </tr>
                {/each}
                {#if data.orgSummaries.length === 0}
                  <tr
                    ><td colspan="4" class="card-empty">No organizations yet</td
                    ></tr
                  >
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Shell ── */
  .shell {
    display: flex;
    min-height: 100vh;
    background: #0a0a0c;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 232px;
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

  .sb-logo {
    padding: 22px 20px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #8b5cf6, #5b21b6);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-text {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #f0f1f4;
  }
  .logo-text span {
    color: #a78bfa;
  }

  .role-badge {
    margin: 14px 14px 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.22);
    border-radius: 100px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a78bfa;
  }
  .role-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #a78bfa;
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .sec-label {
    padding: 16px 20px 5px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin: 0;
  }
  .sb-nav {
    padding: 0 10px;
    flex: 1;
  }
  .sb-section {
    margin-bottom: 4px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s;
    position: relative;
  }
  .nav-link :global(svg) {
    flex-shrink: 0;
    opacity: 0.5;
  }
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #f0f1f4;
  }
  .nav-link.active {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.22);
    color: #a78bfa;
    font-weight: 600;
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
    background: #a78bfa;
  }
  .nav-badge {
    margin-left: auto;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: #f87171;
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
    border-top: 1px solid rgba(255, 255, 255, 0.06);
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
    background: linear-gradient(135deg, #8b5cf6, #5b21b6);
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
    color: #f0f1f4;
  }
  .user-role-lbl {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.3);
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
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
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

  /* ── Mobile ── */
  .m-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.72);
  }
  .m-overlay.open {
    display: block;
  }
  .m-panel {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 232px;
    background: #0f0f12;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .m-head {
    padding: 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .close-x {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Main ── */
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 52px;
    padding: 0 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
    color: rgba(255, 255, 255, 0.5);
    padding: 5px;
    border-radius: 8px;
  }
  .hamburger:hover {
    background: rgba(255, 255, 255, 0.04);
    color: #f0f1f4;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
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
    opacity: 0.35;
  }
  .bc-cur {
    color: #f0f1f4;
    font-weight: 500;
  }
  .admin-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    background: rgba(139, 92, 246, 0.08);
    border: 1px solid rgba(139, 92, 246, 0.18);
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    color: #a78bfa;
  }
  .admin-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #a78bfa;
    animation: blink 2s infinite;
  }

  .content {
    flex: 1;
    padding: 36px 40px;
  }

  /* ── Page header ── */
  .page-hd {
    margin-bottom: 28px;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #a78bfa;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #a78bfa;
    animation: blink 2s infinite;
  }
  .page-title {
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: #f0f1f4;
    margin: 0 0 5px;
  }
  .page-title em {
    font-style: normal;
    color: #a78bfa;
  }
  .page-sub {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0;
  }

  /* ── KPIs ── */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    position: relative;
    transition:
      border-color 0.2s,
      transform 0.18s;
  }
  .kpi:hover {
    border-color: rgba(139, 92, 246, 0.22);
    transform: translateY(-2px);
  }
  .kpi-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .kpi-lbl svg {
    color: #a78bfa;
  }
  .kpi-val {
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    color: #f0f1f4;
  }
  .kpi-meta {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.25);
  }
  .alert-badge {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #f87171;
    font-size: 0.55rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Grids ── */
  .two-col {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  .full-row {
    margin-bottom: 14px;
  }

  /* ── Cards ── */
  .card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
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
    padding: 15px 20px 11px;
  }
  .card-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .card-ti {
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #f0f1f4;
  }
  .link-sm {
    font-size: 0.7rem;
    font-weight: 600;
    color: #a78bfa;
    text-decoration: none;
    opacity: 0.8;
  }
  .link-sm:hover {
    opacity: 1;
  }
  .card-empty {
    text-align: center;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.2);
    padding: 1.5rem;
  }

  /* ── Actor requests ── */
  .req-list {
    padding: 0 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .req-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .req-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .req-id {
    font-size: 0.58rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.25);
    font-family: monospace;
    width: 70px;
    flex-shrink: 0;
  }
  .req-info {
    flex: 1;
    min-width: 0;
  }
  .req-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: #f0f1f4;
  }
  .req-meta {
    font-size: 0.63rem;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 1px;
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
  .req-time {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.25);
    white-space: nowrap;
  }
  .action-btns {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .act-btn {
    width: 25px;
    height: 25px;
    border-radius: 7px;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: none;
    transition:
      background 0.15s,
      transform 0.12s;
  }
  .act-btn:hover {
    transform: translateY(-1px);
  }
  .btn-approve {
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
  }
  .btn-approve:hover {
    background: rgba(74, 222, 128, 0.12);
  }
  .btn-reject {
    border-color: rgba(248, 113, 113, 0.3);
    color: #f87171;
  }
  .btn-reject:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  /* ── Audit log ── */
  .audit-list {
    padding: 0 11px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .audit-row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 9px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.02);
  }
  .audit-sev {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .audit-inf {
    flex: 1;
    min-width: 0;
  }
  .audit-action {
    font-size: 0.7rem;
    font-weight: 700;
    color: #f0f1f4;
    font-family: monospace;
    margin-bottom: 2px;
  }
  .audit-detail {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.3);
  }
  .audit-time {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.25);
    white-space: nowrap;
  }

  /* ── Orgs table ── */
  .t-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  th {
    padding: 9px 16px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  td {
    padding: 11px 16px;
    color: rgba(255, 255, 255, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
  .org-name {
    font-weight: 700;
    color: #f0f1f4;
  }

  /* ── Loading ── */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 10px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.82rem;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.07);
    border-top-color: #a78bfa;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 1200px) {
    .kpi-strip {
      grid-template-columns: repeat(3, 1fr);
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
      grid-template-columns: repeat(2, 1fr);
    }
    .two-col {
      grid-template-columns: 1fr;
    }
  }
</style>
