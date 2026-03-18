<script lang="ts">
  /**
   * /admin/users/+page.svelte
   *
   * Unverified actors show a verification panel with:
   *   - Identity info (name, phone, email from metadata)
   *   - Method chooser: SMS or Email
   *   - Destination input (pre-filled from metadata if available)
   *   - "Send Verification" button → ?/send_verification
   */

  import { enhance } from "$app/forms"

  type Actor = {
    id: string
    type: string
    status: string
    profile_id: string
    created_at: string
    metadata: Record<string, unknown> | null
  }

  type Profile = {
    id: string
    full_name: string | null
    company_name: string | null
    avatar_url: string | null
    unsubscribed: boolean
    permissions_version: number
    created_at: string
  }

  type Data = {
    profiles: Profile[]
    actorsByProfile: Record<string, Actor[]>
    orgMembershipsByProfile: Record<string, any[]>
    unverifiedCount: number
    justUpdated: boolean
    justSentSms: boolean
    justSentEmail: boolean
    justActorUpdated: boolean
  }

  let { data, form }: { data: Data; form: { error?: string } | null } = $props()

  let searchQuery = $state("")
  let editingId: string | null = $state(null)
  let confirmDeactivate: Record<string, boolean> = $state({})

  // Per-actor verification method selection
  let verifyMethod: Record<string, "sms" | "email"> = $state({})

  // Toast
  const toastMsg = data.justSentSms
    ? "SMS code sent — user can now verify at /verify"
    : data.justSentEmail
      ? "Verification email sent — user should receive it shortly"
      : data.justUpdated
        ? "Profile updated"
        : data.justActorUpdated
          ? "Actor status updated"
          : ""
  const toastIsInfo = data.justSentSms || data.justSentEmail
  let showToast = $state(!!toastMsg)
  if (showToast)
    setTimeout(() => {
      showToast = false
    }, 5000)

  // ── Helpers ──────────────────────────────────────────────────

  function timeAgo(dateStr: string): string {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  function initials(name: string | null): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  function actorTypeColor(type: string): string {
    const map: Record<string, string> = {
      DRIVER: "at-driver",
      CONDUCTOR: "at-conductor",
      ORG_CHAIR: "at-chair",
      GENERAL_MANAGER: "at-gm",
      COMPANY_OWNER: "at-owner",
      OWNER: "at-owner",
      FLEET_MANAGER: "at-fleet",
      OPERATIONS_MANAGER: "at-ops",
      BRANCH_MANAGER: "at-branch",
      SECRETARY: "at-secretary",
      ACCOUNTANT: "at-accountant",
      ACCOUNTS_CLERK: "at-clerk",
      AUDITOR: "at-auditor",
      COMPLIANCE_OFFICER: "at-compliance",
      ROUTE_SUPERVISOR: "at-supervisor",
      DISPATCHER: "at-dispatcher",
      MECHANIC: "at-mechanic",
      FIELD_ATTENDANT: "at-field",
      DATA_CLERK: "at-data",
      PASSENGER: "at-passenger",
      GUEST: "at-guest",
      OPERATOR: "at-operator",
      ADMIN: "at-admin",
      SUPER_ADMIN: "at-admin",
      REGULATOR: "at-regulator",
      STAGE_OPERATOR: "at-stage",
    }
    return map[type] ?? "at-default"
  }

  function formatRole(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function getActorMeta(a: Actor): { phone: string; email: string } {
    const m = a.metadata ?? {}
    return {
      phone: String(m.phone ?? m.phone_number ?? ""),
      email: String(m.email ?? ""),
    }
  }

  let filtered = $derived(
    data.profiles.filter((p) => {
      const q = searchQuery.toLowerCase()
      if (!q) return true
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.company_name?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        (data.actorsByProfile[p.id] ?? []).some((a) =>
          a.type?.toLowerCase().includes(q),
        )
      )
    }),
  )
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="pg-root">
  <div class="pg-bg-glow"></div>
  <div class="pg-container">
    <!-- Toast -->
    {#if showToast && toastMsg}
      <div class="pg-toast" class:pg-toast-info={toastIsInfo}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          {#if toastIsInfo}
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
            />
          {:else}
            <polyline points="20 6 9 17 4 12" />
          {/if}
        </svg>
        {toastMsg}
        <button
          class="pg-toast-close"
          onclick={() => {
            showToast = false
          }}>×</button
        >
      </div>
    {/if}

    <!-- Header -->
    <header class="pg-header">
      <div class="pg-header-left">
        <div class="pg-icon-badge">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h1 class="pg-title">Users</h1>
          <p class="pg-subtitle">
            Profiles, actor roles, and organization memberships
          </p>
        </div>
      </div>
      <div class="pg-header-actions">
        {#if data.unverifiedCount > 0}
          <span class="pg-unverified-badge">
            <span class="pg-unverified-dot"></span>
            {data.unverifiedCount} awaiting verification
          </span>
        {/if}
        <span class="pg-count-badge">
          <span class="pg-count-num">{data.profiles.length}</span> users
        </span>
      </div>
    </header>

    <!-- Action error -->
    {#if form?.error}
      <div class="pg-error">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- Search -->
    <div class="pg-search-bar">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search by name, company, or role…"
        class="pg-search-input"
      />
      {#if searchQuery}
        <span class="pg-search-count">{filtered.length}</span>
      {/if}
    </div>

    {#if filtered.length === 0}
      <div class="pg-empty">
        <div class="pg-empty-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
              cx="9"
              cy="7"
              r="4"
            />
          </svg>
        </div>
        <h2 class="pg-empty-title">
          {searchQuery ? "No matches" : "No users yet"}
        </h2>
        <p class="pg-empty-text">
          {searchQuery
            ? "Try a different search."
            : "Users appear here once profiles are created."}
        </p>
      </div>
    {:else}
      <div class="pg-list">
        {#each filtered as p, i}
          {@const actors = data.actorsByProfile[p.id] ?? []}
          {@const memberships = data.orgMembershipsByProfile[p.id] ?? []}
          {@const hasUnverified = actors.some((a) => a.status === "unverified")}

          <div
            class="pg-card"
            class:pg-card-pending={hasUnverified}
            style="animation-delay:{i * 45}ms"
          >
            <!-- User header -->
            <div class="pg-user-header">
              <div class="pg-user-left">
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt="" class="pg-avatar" />
                {:else}
                  <div class="pg-avatar-placeholder">
                    {initials(p.full_name)}
                  </div>
                {/if}
                <div class="pg-user-info">
                  <h3 class="pg-user-name">{p.full_name ?? "Unnamed User"}</h3>
                  <div class="pg-user-meta">
                    {#if p.company_name}<span class="pg-company"
                        >{p.company_name}</span
                      >{/if}
                    {#if p.created_at}<span class="pg-joined"
                        >Joined {timeAgo(p.created_at)}</span
                      >{/if}
                  </div>
                </div>
              </div>
              <button
                class="pg-btn-edit"
                class:pg-btn-edit-active={editingId === p.id}
                onclick={() => (editingId = editingId === p.id ? null : p.id)}
                title="Edit profile"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
              </button>
            </div>

            <!-- Edit profile form -->
            {#if editingId === p.id}
              <form
                method="post"
                action="?/update_profile"
                use:enhance
                class="pg-edit-form pg-slide-in"
              >
                <input type="hidden" name="id" value={p.id} />
                <div class="pg-edit-grid">
                  <div class="pg-form-group">
                    <label class="pg-label" for={"fn_" + p.id}>Full Name</label>
                    <input
                      id={"fn_" + p.id}
                      name="full_name"
                      value={p.full_name ?? ""}
                      class="pg-input"
                      placeholder="Full name"
                    />
                  </div>
                  <div class="pg-form-group">
                    <label class="pg-label" for={"cn_" + p.id}>Company</label>
                    <input
                      id={"cn_" + p.id}
                      name="company_name"
                      value={p.company_name ?? ""}
                      class="pg-input"
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div class="pg-edit-actions">
                  <button
                    type="button"
                    class="pg-btn-cancel"
                    onclick={() => (editingId = null)}>Cancel</button
                  >
                  <button type="submit" class="pg-btn-submit"
                    >Save Changes</button
                  >
                </div>
              </form>
            {/if}

            <!-- Actor roles -->
            {#if actors.length > 0}
              <div class="pg-section-label">Actor Roles</div>
              <div class="pg-actor-list">
                {#each actors as a}
                  {@const meta = getActorMeta(a)}
                  {@const method = verifyMethod[a.id] ?? "sms"}

                  <div class="pg-actor-row">
                    {#if a.status === "unverified"}
                      <!-- ── VERIFICATION PANEL ──────────────────────────── -->
                      <div class="pg-verify-panel pg-slide-in">
                        <div class="pg-verify-header">
                          <span class="pg-actor-chip at-unverified">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {formatRole(a.type)} — Unverified
                          </span>
                          <span class="pg-verify-time"
                            >Since {timeAgo(a.created_at)}</span
                          >
                        </div>

                        <!-- Identity preview -->
                        <div class="pg-verify-identity">
                          <div class="pg-verify-field">
                            <span class="pg-verify-label">Name</span>
                            <span class="pg-verify-value"
                              >{p.full_name ?? "—"}</span
                            >
                          </div>
                          {#if meta.phone}
                            <div class="pg-verify-field">
                              <span class="pg-verify-label">Phone</span>
                              <span class="pg-verify-value">{meta.phone}</span>
                            </div>
                          {/if}
                          {#if meta.email}
                            <div class="pg-verify-field">
                              <span class="pg-verify-label">Email</span>
                              <span class="pg-verify-value">{meta.email}</span>
                            </div>
                          {/if}
                        </div>

                        <!-- Send verification form -->
                        <form
                          method="post"
                          action="?/send_verification"
                          use:enhance
                          class="pg-send-form"
                        >
                          <input type="hidden" name="actor_id" value={a.id} />

                          <!-- Method tabs -->
                          <div class="pg-method-tabs">
                            <button
                              type="button"
                              class="pg-method-tab"
                              class:pg-method-tab-active={method === "sms"}
                              onclick={() => {
                                verifyMethod[a.id] = "sms"
                              }}
                            >
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <path
                                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                                />
                              </svg>
                              SMS OTP
                            </button>
                            <button
                              type="button"
                              class="pg-method-tab"
                              class:pg-method-tab-active={method === "email"}
                              onclick={() => {
                                verifyMethod[a.id] = "email"
                              }}
                            >
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <path
                                  d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              Email Link
                            </button>
                          </div>

                          <input type="hidden" name="method" value={method} />

                          <!-- Destination input -->
                          <div class="pg-form-group">
                            {#if method === "sms"}
                              <label class="pg-label" for={"dest_" + a.id}
                                >Phone Number</label
                              >
                              <input
                                id={"dest_" + a.id}
                                name="destination"
                                type="tel"
                                placeholder="0712 345 678"
                                value={meta.phone}
                                class="pg-input pg-input-sm"
                              />
                              <span class="pg-dest-hint"
                                >User will receive a 6-digit code via SMS</span
                              >
                            {:else}
                              <label class="pg-label" for={"dest_" + a.id}
                                >Email Address</label
                              >
                              <input
                                id={"dest_" + a.id}
                                name="destination"
                                type="email"
                                placeholder="user@example.com"
                                value={meta.email}
                                class="pg-input pg-input-sm"
                              />
                              <span class="pg-dest-hint"
                                >User will receive a magic link via email</span
                              >
                            {/if}
                          </div>

                          <button type="submit" class="pg-btn-send">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Send {method === "sms" ? "OTP Code" : "Magic Link"}
                          </button>
                        </form>
                      </div>
                    {:else}
                      <!-- ── ACTIVE / INACTIVE ───────────────────────────── -->
                      <span
                        class="pg-actor-chip {actorTypeColor(a.type)}"
                        class:pg-actor-chip-inactive={a.status !== "active"}
                      >
                        {formatRole(a.type)}
                        {#if a.status === "inactive"}<span
                            class="pg-actor-status-badge">inactive</span
                          >{/if}
                      </span>

                      {#if a.status === "active"}
                        {#if confirmDeactivate[a.id]}
                          <form
                            method="post"
                            action="?/deactivate_actor"
                            use:enhance
                            class="pg-actor-action-form pg-slide-in"
                          >
                            <input type="hidden" name="actor_id" value={a.id} />
                            <button
                              type="submit"
                              class="pg-btn-actor-deactivate-confirm"
                              >Deactivate</button
                            >
                            <button
                              type="button"
                              class="pg-btn-actor-cancel"
                              onclick={() => {
                                confirmDeactivate[a.id] = false
                              }}>×</button
                            >
                          </form>
                        {:else}
                          <button
                            class="pg-btn-actor-deactivate"
                            onclick={() => {
                              confirmDeactivate[a.id] = true
                            }}
                            title="Deactivate"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" /><line
                                x1="6"
                                y1="6"
                                x2="18"
                                y2="18"
                              />
                            </svg>
                          </button>
                        {/if}
                      {:else}
                        <form
                          method="post"
                          action="?/reactivate_actor"
                          use:enhance
                        >
                          <input type="hidden" name="actor_id" value={a.id} />
                          <button type="submit" class="pg-btn-actor-reactivate"
                            >Reactivate</button
                          >
                        </form>
                      {/if}
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <div class="pg-no-actors">No actor roles assigned</div>
            {/if}

            <!-- Org memberships -->
            {#if memberships.length > 0}
              <div class="pg-section-label" style="margin-top:.5rem">
                Organizations
              </div>
              <div class="pg-memberships">
                {#each memberships as m}
                  <div class="pg-membership-chip">
                    <span class="pg-org-name"
                      >{m.organizations?.name ??
                        m.organization_id.slice(0, 8) + "…"}</span
                    >
                    <span class="pg-org-role">{m.role}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Footer -->
            <div class="pg-card-footer">
              <div class="pg-id-row">
                <span class="pg-id-label">UID</span>
                <code class="pg-id-value">{p.id}</code>
              </div>
              <div class="pg-footer-meta">
                {#if p.unsubscribed}<span class="pg-unsub-tag"
                    >Unsubscribed</span
                  >{/if}
                <span class="pg-perm-ver" title="Permissions version"
                  >v{p.permissions_version}</span
                >
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
  }

  .pg-root {
    position: relative;
    min-height: 100vh;
    background: #0c0e13;
    color: #e2e4e9;
    padding: 2rem 1rem 4rem;
    overflow: hidden;
  }
  .pg-bg-glow {
    position: fixed;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 600px;
    background: radial-gradient(
      ellipse,
      rgba(251, 191, 36, 0.05) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 0;
  }
  .pg-container {
    position: relative;
    z-index: 1;
    max-width: 760px;
    margin: 0 auto;
  }

  /* Toast */
  .pg-toast {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 1.1rem;
    margin-bottom: 1.25rem;
    background: rgba(74, 222, 128, 0.08);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: 10px;
    font-size: 0.85rem;
    color: #86efac;
  }
  .pg-toast-info {
    background: rgba(96, 165, 250, 0.08);
    border-color: rgba(96, 165, 250, 0.2);
    color: #93c5fd;
  }
  .pg-toast-close {
    margin-left: auto;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0;
  }

  /* Header */
  .pg-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.75rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .pg-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .pg-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.15),
      rgba(251, 191, 36, 0.05)
    );
    border: 1px solid rgba(251, 191, 36, 0.2);
    color: #fbbf24;
    flex-shrink: 0;
  }
  .pg-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0;
  }
  .pg-subtitle {
    font-size: 0.85rem;
    color: #6b7084;
    margin: 0.2rem 0 0;
  }
  .pg-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
    padding-top: 0.25rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .pg-count-badge {
    font-size: 0.8rem;
    font-weight: 500;
    color: #8b8fa3;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 100px;
    padding: 0.35rem 0.85rem;
  }
  .pg-count-num {
    color: #c8cbd3;
    font-weight: 600;
  }
  .pg-unverified-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 100px;
    padding: 0.35rem 0.85rem;
  }
  .pg-unverified-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fbbf24;
    animation: pg-pulse 2s ease-in-out infinite;
  }
  @keyframes pg-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .pg-error {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }

  /* Search */
  .pg-search-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 0.6rem 1rem;
    margin-bottom: 1.5rem;
    color: #555a6e;
    transition: border-color 0.15s;
  }
  .pg-search-bar:focus-within {
    border-color: rgba(251, 191, 36, 0.3);
  }
  .pg-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .pg-search-input::placeholder {
    color: #44475a;
  }
  .pg-search-count {
    font-size: 0.75rem;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    padding: 0.1rem 0.45rem;
    border-radius: 100px;
    font-weight: 600;
  }

  /* Empty */
  .pg-empty {
    text-align: center;
    padding: 4rem 2rem;
  }
  .pg-empty-icon {
    color: #fbbf24;
    margin-bottom: 1.2rem;
    opacity: 0.7;
  }
  .pg-empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #d1d5db;
    margin: 0 0 0.4rem;
  }
  .pg-empty-text {
    font-size: 0.9rem;
    color: #6b7084;
    margin: 0;
  }

  /* Cards */
  .pg-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .pg-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    animation: pg-card-in 0.4s ease-out both;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  .pg-card:hover {
    border-color: rgba(251, 191, 36, 0.12);
    box-shadow:
      0 0 0 1px rgba(251, 191, 36, 0.04),
      0 8px 32px rgba(0, 0, 0, 0.2);
  }
  .pg-card-pending {
    border-left: 3px solid rgba(251, 191, 36, 0.4);
  }
  @keyframes pg-card-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* User header */
  .pg-user-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .pg-user-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .pg-avatar {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .pg-avatar-placeholder {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.12),
      rgba(251, 191, 36, 0.04)
    );
    border: 1px solid rgba(251, 191, 36, 0.15);
    font-size: 0.82rem;
    font-weight: 700;
    color: #fbbf24;
  }
  .pg-user-info {
    min-width: 0;
  }
  .pg-user-name {
    font-size: 1rem;
    font-weight: 600;
    color: #f0f1f4;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pg-user-meta {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .pg-company {
    font-size: 0.78rem;
    color: #8b8fa3;
  }
  .pg-joined {
    font-size: 0.75rem;
    color: #555a6e;
  }
  .pg-btn-edit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: #8b8fa3;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .pg-btn-edit:hover,
  .pg-btn-edit-active {
    background: rgba(251, 191, 36, 0.08);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.15);
  }

  .pg-section-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #44475a;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  /* Actor list */
  .pg-actor-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .pg-actor-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Verification panel */
  .pg-verify-panel {
    width: 100%;
    background: rgba(251, 191, 36, 0.03);
    border: 1px solid rgba(251, 191, 36, 0.14);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .pg-verify-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .pg-verify-time {
    font-size: 0.72rem;
    color: #555a6e;
  }
  .pg-verify-identity {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }
  .pg-verify-field {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .pg-verify-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555a6e;
    font-weight: 600;
  }
  .pg-verify-value {
    font-size: 0.85rem;
    color: #e2e4e9;
    font-weight: 500;
  }

  /* Send form */
  .pg-send-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Method tabs */
  .pg-method-tabs {
    display: flex;
    gap: 0.4rem;
  }
  .pg-method-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #6b7084;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pg-method-tab:hover {
    color: #c8cbd3;
    border-color: rgba(255, 255, 255, 0.12);
  }
  .pg-method-tab-active {
    color: #60a5fa !important;
    background: rgba(96, 165, 250, 0.1) !important;
    border-color: rgba(96, 165, 250, 0.2) !important;
  }

  .pg-dest-hint {
    font-size: 0.7rem;
    color: #44475a;
  }

  .pg-btn-send {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.82rem;
    font-weight: 700;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.12s;
    width: fit-content;
  }
  .pg-btn-send:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  /* Actor chips */
  .pg-actor-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.22rem 0.6rem;
    border-radius: 6px;
    text-transform: capitalize;
    transition: opacity 0.15s;
  }
  .pg-actor-chip-inactive {
    opacity: 0.4;
    text-decoration: line-through;
  }
  .pg-actor-status-badge {
    font-size: 0.62rem;
    font-weight: 400;
    opacity: 0.8;
    font-style: italic;
    text-decoration: none;
  }
  .at-unverified {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
  }
  .at-driver {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }
  .at-conductor {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.1);
  }
  .at-chair {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
  }
  .at-gm {
    color: #fb923c;
    background: rgba(251, 146, 60, 0.1);
  }
  .at-owner {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }
  .at-fleet {
    color: #34d399;
    background: rgba(52, 211, 153, 0.1);
  }
  .at-ops {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.08);
  }
  .at-branch {
    color: #6ee7b7;
    background: rgba(110, 231, 183, 0.08);
  }
  .at-secretary {
    color: #93c5fd;
    background: rgba(147, 197, 253, 0.08);
  }
  .at-accountant {
    color: #86efac;
    background: rgba(134, 239, 172, 0.08);
  }
  .at-clerk {
    color: #bbf7d0;
    background: rgba(187, 247, 208, 0.06);
  }
  .at-auditor {
    color: #d1fae5;
    background: rgba(209, 250, 229, 0.05);
  }
  .at-compliance {
    color: #a7f3d0;
    background: rgba(167, 243, 208, 0.06);
  }
  .at-supervisor {
    color: #7dd3fc;
    background: rgba(125, 211, 252, 0.1);
  }
  .at-dispatcher {
    color: #bae6fd;
    background: rgba(186, 230, 253, 0.08);
  }
  .at-mechanic {
    color: #fca5a5;
    background: rgba(252, 165, 165, 0.08);
  }
  .at-field {
    color: #e5e7eb;
    background: rgba(229, 231, 235, 0.05);
  }
  .at-data {
    color: #d1d5db;
    background: rgba(209, 213, 219, 0.05);
  }
  .at-passenger {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }
  .at-guest {
    color: #6b7280;
    background: rgba(107, 114, 128, 0.08);
  }
  .at-operator {
    color: #f472b6;
    background: rgba(244, 114, 182, 0.1);
  }
  .at-admin {
    color: #c084fc;
    background: rgba(192, 132, 252, 0.12);
  }
  .at-regulator {
    color: #e879f9;
    background: rgba(232, 121, 249, 0.08);
  }
  .at-stage {
    color: #d946ef;
    background: rgba(217, 70, 239, 0.08);
  }
  .at-default {
    color: #8b8fa3;
    background: rgba(139, 143, 163, 0.08);
  }

  /* Actor buttons */
  .pg-btn-actor-deactivate {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    border: 1px solid rgba(248, 113, 113, 0.15);
    background: rgba(248, 113, 113, 0.06);
    color: #f87171;
    cursor: pointer;
    flex-shrink: 0;
  }
  .pg-btn-actor-deactivate:hover {
    background: rgba(248, 113, 113, 0.14);
  }
  .pg-actor-action-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .pg-btn-actor-deactivate-confirm {
    padding: 0.2rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #fff;
    background: #dc2626;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .pg-btn-actor-cancel {
    background: none;
    border: none;
    color: #6b7084;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0 0.2rem;
  }
  .pg-btn-actor-reactivate {
    padding: 0.2rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #6ee7a0, #3abf72);
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .pg-no-actors {
    font-size: 0.78rem;
    color: #44475a;
    font-style: italic;
    margin-bottom: 0.75rem;
  }

  /* Memberships */
  .pg-memberships {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .pg-membership-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    padding: 0.2rem 0.55rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }
  .pg-org-name {
    color: #c8cbd3;
    font-weight: 500;
  }
  .pg-org-role {
    color: #555a6e;
    text-transform: capitalize;
  }

  /* Edit form */
  .pg-edit-form {
    margin: 0.75rem 0;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(251, 191, 36, 0.12);
    border-radius: 12px;
  }
  .pg-edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .pg-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  /* Footer */
  .pg-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
  }
  .pg-id-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pg-id-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #44475a;
    font-weight: 600;
  }
  .pg-id-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #555a6e;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }
  .pg-footer-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pg-unsub-tag {
    font-size: 0.68rem;
    font-weight: 500;
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
  }
  .pg-perm-ver {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.68rem;
    color: #44475a;
  }

  /* Form elements */
  .pg-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pg-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7084;
    font-weight: 600;
  }
  .pg-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .pg-input-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.82rem;
  }
  .pg-input::placeholder {
    color: #44475a;
  }
  .pg-input:focus {
    border-color: rgba(96, 165, 250, 0.4);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.08);
  }
  .pg-btn-cancel {
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #8b8fa3;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    cursor: pointer;
  }
  .pg-btn-submit {
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  .pg-slide-in {
    animation: pg-slide 0.25s ease-out;
  }
  @keyframes pg-slide {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .pg-root {
      padding: 1.25rem 0.75rem 3rem;
    }
    .pg-header {
      flex-direction: column;
    }
    .pg-card {
      padding: 1.15rem;
    }
    .pg-edit-grid {
      grid-template-columns: 1fr;
    }
    .pg-verify-identity {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
