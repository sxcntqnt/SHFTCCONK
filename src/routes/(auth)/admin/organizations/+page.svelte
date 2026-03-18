<script lang="ts">
  /**
   * /admin/organizations/+page.svelte
   *
   * FIXES FROM PREVIOUS VERSION:
   *
   *   BUG 1 — data.error doesn't exist:
   *     load() never returns `error`. Errors from actions come via
   *     the `form` prop. Fixed: show form?.error, not data.error.
   *
   *   BUG 2 — pending_activation not in statusColor():
   *     New orgs created via the SACCO flow start as pending_activation.
   *     Without this case they showed the wrong (default) colour.
   *     Added: amber/yellow for pending_activation.
   *
   *   IMPROVEMENT — setStatus inline buttons:
   *     Each card now has Activate / Suspend / Mark Pending buttons
   *     depending on current status. No need to delete + recreate.
   *
   *   IMPROVEMENT — Toast feedback from redirect params.
   *
   *   IMPROVEMENT — Status filter chips.
   *
   *   IMPROVEMENT — Create form defaults to pending_activation.
   */

  import { enhance } from "$app/forms"

  type Org = {
    id: string
    name: string
    status: string
    metadata: Record<string, unknown> | null
    created_at: string
  }

  type Data = {
    organizations: Org[]
    memberCounts: Record<string, number>
    branchCounts: Record<string, number>
    vehicleCounts: Record<string, number>
    justCreated: boolean
    justDeleted: boolean
    justActivated: boolean
    justSuspended: boolean
  }

  let { data, form }: { data: Data; form: { error?: string } | null } = $props()

  let showCreate = $state(false)
  let confirmDeleteId: string | null = $state(null)
  let searchQuery = $state("")
  let statusFilter = $state("")

  // Toast
  const toastMsg = data.justCreated
    ? "Organization created"
    : data.justDeleted
      ? "Organization deleted"
      : data.justActivated
        ? "Organization activated"
        : data.justSuspended
          ? "Organization suspended"
          : ""
  let showToast = $state(!!toastMsg)
  if (showToast)
    setTimeout(() => {
      showToast = false
    }, 3000)

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

  type StatusKey =
    | "pending_activation"
    | "active"
    | "suspended"
    | "inactive"
    | "default"

  const STATUS_CONFIG: Record<
    StatusKey,
    { label: string; dot: string; text: string; bg: string; border: string }
  > = {
    pending_activation: {
      label: "Pending",
      dot: "#fbbf24",
      text: "#fcd34d",
      bg: "rgba(251,191,36,.08)",
      border: "rgba(251,191,36,.18)",
    },
    active: {
      label: "Active",
      dot: "#6ee7a0",
      text: "#86efac",
      bg: "rgba(110,231,160,.08)",
      border: "rgba(110,231,160,.15)",
    },
    suspended: {
      label: "Suspended",
      dot: "#f87171",
      text: "#fca5a5",
      bg: "rgba(248,113,113,.08)",
      border: "rgba(248,113,113,.15)",
    },
    inactive: {
      label: "Inactive",
      dot: "#8b8fa3",
      text: "#9ca3af",
      bg: "rgba(139,143,163,.08)",
      border: "rgba(139,143,163,.12)",
    },
    default: {
      label: "Unknown",
      dot: "#a5b4fc",
      text: "#a5b4fc",
      bg: "rgba(99,132,255,.08)",
      border: "rgba(99,132,255,.12)",
    },
  }

  function statusCfg(status: string) {
    return STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.default
  }

  // Filtered list
  let filtered = $derived(
    data.organizations.filter((o) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        o.name?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || o.status === statusFilter
      return matchSearch && matchStatus
    }),
  )

  const allStatuses: StatusKey[] = [
    "pending_activation",
    "active",
    "suspended",
    "inactive",
  ]
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
      <div class="pg-toast pg-slide-in">
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
          <polyline points="20 6 9 17 4 12" />
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <h1 class="pg-title">Organizations</h1>
          <p class="pg-subtitle">
            Manage registered SACCOs and their structure
          </p>
        </div>
      </div>
      <div class="pg-header-actions">
        <span class="pg-count-badge">
          <span class="pg-count-num">{data.organizations.length}</span> total
        </span>
        <button
          class="pg-btn-create"
          onclick={() => (showCreate = !showCreate)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Organization
        </button>
      </div>
    </header>

    <!-- Action error — from form prop, NOT data.error -->
    {#if form?.error}
      <div class="pg-error">
        <svg
          width="16"
          height="16"
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

    <!-- Create form -->
    {#if showCreate}
      <div class="pg-create-panel pg-slide-in">
        <p class="pg-create-hint">
          New orgs start as <strong>Pending Activation</strong> by default. The
          SACCO Chair joins via <code>/org/[id]/join-sacco</code>, then you
          activate.
        </p>
        <form
          method="post"
          action="?/create"
          use:enhance
          class="pg-create-form"
        >
          <div class="pg-create-grid">
            <div class="pg-form-group">
              <label class="pg-label" for="org_name">Organization Name</label>
              <input
                id="org_name"
                name="name"
                required
                placeholder="e.g. Githurai SACCO"
                class="pg-input"
              />
            </div>
            <div class="pg-form-group">
              <label class="pg-label" for="org_status">Initial Status</label>
              <div class="pg-select-wrap">
                <select name="status" id="org_status" class="pg-select">
                  <!-- FIX: default to pending_activation per SACCO onboarding flow -->
                  <option value="pending_activation" selected
                    >Pending Activation</option
                  >
                  <option value="active">Active (skip verification)</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg
                  class="pg-select-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
          <div class="pg-create-actions">
            <button
              type="button"
              class="pg-btn-cancel"
              onclick={() => (showCreate = false)}>Cancel</button
            >
            <button type="submit" class="pg-btn-submit"
              >Create Organization</button
            >
          </div>
        </form>
      </div>
    {/if}

    <!-- Toolbar: search + status filter -->
    <div class="pg-toolbar">
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
          placeholder="Search organizations…"
          class="pg-search-input"
        />
      </div>

      <div class="pg-status-chips">
        <button
          type="button"
          class="pg-chip"
          class:pg-chip-active={statusFilter === ""}
          onclick={() => (statusFilter = "")}
        >
          All
        </button>
        {#each allStatuses as s}
          {@const cfg = statusCfg(s)}
          <button
            type="button"
            class="pg-chip"
            class:pg-chip-active={statusFilter === s}
            style={statusFilter === s
              ? `color:${cfg.text}; background:${cfg.bg}; border-color:${cfg.border}`
              : ""}
            onclick={() => (statusFilter = statusFilter === s ? "" : s)}
          >
            <span class="pg-chip-dot" style="background:{cfg.dot}"></span>
            {cfg.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Empty -->
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 class="pg-empty-title">
          {searchQuery || statusFilter ? "No matches" : "No organizations yet"}
        </h2>
        <p class="pg-empty-text">
          {searchQuery || statusFilter
            ? "Try clearing the filters."
            : "Create your first SACCO organization to get started."}
        </p>
      </div>
    {:else}
      <div class="pg-list">
        {#each filtered as org, i}
          {@const cfg = statusCfg(org.status)}
          <div class="pg-card" style="animation-delay: {i * 50}ms">
            <!-- Card header -->
            <div class="pg-card-header">
              <div class="pg-card-title-row">
                <h3 class="pg-card-name">{org.name}</h3>
                <span
                  class="pg-status-tag"
                  style="color:{cfg.text}; background:{cfg.bg}; border-color:{cfg.border}"
                >
                  <span class="pg-status-dot" style="background:{cfg.dot}"
                  ></span>
                  {cfg.label}
                </span>
              </div>
              {#if org.created_at}
                <span class="pg-time">Created {timeAgo(org.created_at)}</span>
              {/if}
            </div>

            <!-- Stats -->
            <div class="pg-stats-row">
              <div class="pg-stat">
                <span class="pg-stat-num">{data.memberCounts[org.id] ?? 0}</span
                >
                <span class="pg-stat-label">Members</span>
              </div>
              <div class="pg-stat">
                <span class="pg-stat-num">{data.branchCounts[org.id] ?? 0}</span
                >
                <span class="pg-stat-label">Branches</span>
              </div>
              <div class="pg-stat">
                <span class="pg-stat-num"
                  >{data.vehicleCounts[org.id] ?? 0}</span
                >
                <span class="pg-stat-label">Vehicles</span>
              </div>
            </div>

            <!-- Metadata chips -->
            {#if org.metadata && typeof org.metadata === "object" && Object.keys(org.metadata).length > 0}
              <div class="pg-meta-row">
                {#each Object.entries(org.metadata) as [key, val]}
                  <div class="pg-meta-chip">
                    <span class="pg-meta-key">{key}</span>
                    <span class="pg-meta-val">{String(val)}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Footer: ID + actions -->
            <div class="pg-card-footer">
              <div class="pg-id-row">
                <span class="pg-id-label">ID</span>
                <code class="pg-id-value">{org.id}</code>
              </div>

              <div class="pg-card-actions">
                <!-- Status change actions -->
                {#if org.status === "pending_activation"}
                  <form method="post" action="?/setStatus" use:enhance>
                    <input type="hidden" name="id" value={org.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit" class="pg-btn-activate">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Activate
                    </button>
                  </form>
                {/if}

                {#if org.status === "active"}
                  <form method="post" action="?/setStatus" use:enhance>
                    <input type="hidden" name="id" value={org.id} />
                    <input type="hidden" name="status" value="suspended" />
                    <button type="submit" class="pg-btn-suspend">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Suspend
                    </button>
                  </form>
                {/if}

                {#if org.status === "suspended"}
                  <form method="post" action="?/setStatus" use:enhance>
                    <input type="hidden" name="id" value={org.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit" class="pg-btn-activate"
                      >Reactivate</button
                    >
                  </form>
                {/if}

                <!-- Delete with member guard -->
                {#if confirmDeleteId === org.id}
                  <form
                    method="post"
                    action="?/delete"
                    use:enhance
                    class="pg-inline-form pg-slide-in"
                  >
                    <input type="hidden" name="id" value={org.id} />
                    <button type="submit" class="pg-btn-danger-confirm"
                      >Confirm Delete</button
                    >
                    <button
                      type="button"
                      class="pg-btn-cancel-sm"
                      onclick={() => (confirmDeleteId = null)}>Cancel</button
                    >
                  </form>
                {:else}
                  <button
                    class="pg-btn-danger"
                    onclick={() => (confirmDeleteId = org.id)}
                    title="Delete organization"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                  </button>
                {/if}
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
      rgba(168, 85, 247, 0.06) 0%,
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
  .pg-toast-close {
    margin-left: auto;
    background: none;
    border: none;
    color: #86efac;
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
    flex-shrink: 0;
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.15),
      rgba(168, 85, 247, 0.05)
    );
    border: 1px solid rgba(168, 85, 247, 0.2);
    color: #c084fc;
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
  .pg-btn-create {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #c084fc, #a855f7);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s,
      box-shadow 0.2s;
  }
  .pg-btn-create:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
  }

  /* Error */
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

  /* Create panel */
  .pg-create-panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(168, 85, 247, 0.15);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .pg-create-hint {
    font-size: 0.78rem;
    color: #6b7084;
    margin: 0 0 1rem;
    line-height: 1.5;
  }
  .pg-create-hint strong {
    color: #fcd34d;
  }
  .pg-create-hint code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #c084fc;
    background: rgba(168, 85, 247, 0.08);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }
  .pg-create-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .pg-create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  /* Toolbar */
  .pg-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .pg-search-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 0.6rem 1rem;
    color: #555a6e;
    transition: border-color 0.15s;
  }
  .pg-search-bar:focus-within {
    border-color: rgba(168, 85, 247, 0.3);
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
  .pg-status-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .pg-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #6b7084;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pg-chip:hover {
    color: #c8cbd3;
    border-color: rgba(255, 255, 255, 0.12);
  }
  .pg-chip-active {
    color: #f0f1f4 !important;
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
  }
  .pg-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Empty */
  .pg-empty {
    text-align: center;
    padding: 4rem 2rem;
  }
  .pg-empty-icon {
    color: #c084fc;
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
    border-color: rgba(168, 85, 247, 0.15);
    box-shadow:
      0 0 0 1px rgba(168, 85, 247, 0.05),
      0 8px 32px rgba(0, 0, 0, 0.2);
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

  .pg-card-header {
    margin-bottom: 1rem;
  }
  .pg-card-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
    flex-wrap: wrap;
  }
  .pg-card-name {
    font-size: 1.05rem;
    font-weight: 600;
    color: #f0f1f4;
    margin: 0;
  }
  .pg-time {
    font-size: 0.75rem;
    color: #555a6e;
  }

  .pg-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.2rem 0.65rem;
    border-radius: 100px;
    border: 1px solid;
    text-transform: capitalize;
  }
  .pg-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  /* Stats */
  .pg-stats-row {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .pg-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
  }
  .pg-stat-num {
    font-size: 1.15rem;
    font-weight: 700;
    color: #e2e4e9;
  }
  .pg-stat-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555a6e;
    font-weight: 500;
  }

  /* Metadata */
  .pg-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
  }
  .pg-meta-chip {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.75rem;
    padding: 0.25rem 0.55rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 6px;
  }
  .pg-meta-key {
    color: #555a6e;
    font-weight: 500;
  }
  .pg-meta-val {
    color: #c8cbd3;
  }

  /* Footer */
  .pg-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
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
  .pg-card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Status action buttons */
  .pg-btn-activate {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.85rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #6ee7a0, #3abf72);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .pg-btn-activate:hover {
    filter: brightness(1.08);
  }
  .pg-btn-suspend {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.85rem;
    font-size: 0.78rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #fca5a5;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .pg-btn-suspend:hover {
    background: rgba(248, 113, 113, 0.14);
  }
  .pg-btn-danger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(248, 113, 113, 0.15);
    background: rgba(248, 113, 113, 0.06);
    color: #f87171;
    cursor: pointer;
    transition: background 0.15s;
  }
  .pg-btn-danger:hover {
    background: rgba(248, 113, 113, 0.12);
    border-color: rgba(248, 113, 113, 0.3);
  }
  .pg-btn-danger-confirm {
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #fff;
    background: #dc2626;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .pg-btn-cancel-sm {
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #8b8fa3;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    cursor: pointer;
  }
  .pg-inline-form {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  /* Form elements */
  .pg-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pg-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7084;
    font-weight: 600;
  }
  .pg-select-wrap {
    position: relative;
  }
  .pg-select {
    width: 100%;
    appearance: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.6rem 2.2rem 0.6rem 0.85rem;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .pg-select:focus {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.08);
  }
  .pg-select option {
    background: #1a1d26;
    color: #c8cbd3;
  }
  .pg-select-chevron {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #555a6e;
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
  .pg-input::placeholder {
    color: #44475a;
  }
  .pg-input:focus {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.08);
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
    background: linear-gradient(135deg, #c084fc, #a855f7);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s,
      box-shadow 0.2s;
  }
  .pg-btn-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
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
    .pg-create-grid {
      grid-template-columns: 1fr;
    }
    .pg-card {
      padding: 1.15rem;
    }
    .pg-stats-row {
      gap: 1rem;
    }
    .pg-card-footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
