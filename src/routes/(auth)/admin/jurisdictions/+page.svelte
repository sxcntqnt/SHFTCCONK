<script lang="ts">
  /**
   * /admin/jurisdictions/+page.svelte
   *
   * FIXES FROM PREVIOUS VERSION:
   *
   *   CRITICAL — Level option values now use "org" not "organization":
   *     Before: <option value="organization">Organization</option>
   *     After:  <option value="org">Organization</option>
   *     The DB and auth.store.ts JURISDICTION_LEVELS use "org".
   *     Storing "organization" silently broke all permission checks.
   *
   *   FIX — selectedLevel filter was declared but never used:
   *     The `filtered` derived only searched by text query.
   *     Now filters by both searchQuery AND selectedLevel.
   *
   *   IMPROVEMENT — Success toasts from redirect params:
   *     justCreated / justDeleted from load() now show a dismissible
   *     toast banner at the top.
   *
   *   IMPROVEMENT — Action error display:
   *     Form submission errors from fail() now surface inline.
   *
   *   IMPROVEMENT — loadWarnings banner:
   *     If dropdown queries failed, a soft warning is shown.
   */

  import { enhance } from "$app/forms"

  type Actor = {
    id: string
    type: string
    profile_id: string
    status: string
    profiles: { full_name: string | null } | null
  }

  type Jurisdiction = {
    id: string
    actor_id: string
    level: string
    scope_id: string | null
    created_at: string
    actors: {
      id: string
      type: string
      profile_id: string
      profiles: { full_name: string | null; avatar_url: string | null } | null
    } | null
  }

  type Data = {
    jurisdictions: Jurisdiction[]
    actors: Actor[]
    organizations: { id: string; name: string; status: string }[]
    branches: { id: string; name: string; organization_id: string }[]
    justCreated: boolean
    justDeleted: boolean
    loadWarnings: string[]
  }

  let { data, form }: { data: Data; form: { error?: string } | null } = $props()

  let showCreate = $state(false)
  let confirmDeleteId: string | null = $state(null)
  let searchQuery = $state("")
  let selectedLevel = $state("") // FIX: now wired to filter
  let showToast = $state(data.justCreated || data.justDeleted)

  const toastMsg = data.justCreated
    ? "Jurisdiction assigned successfully"
    : data.justDeleted
      ? "Jurisdiction removed"
      : ""

  // Dismiss toast after 3s
  if (showToast) {
    setTimeout(() => {
      showToast = false
    }, 3000)
  }

  // ── Display helpers ──────────────────────────────────────────

  function actorLabel(j: Jurisdiction): string {
    const name = j.actors?.profiles?.full_name
    const type = j.actors?.type
    if (name && type) return `${name} (${type})`
    if (name) return name
    if (type) return type
    return (j.actor_id?.slice(0, 8) ?? "?") + "…"
  }

  function actorOptionLabel(a: Actor): string {
    const name = a.profiles?.full_name
    return name ? `${name} — ${a.type}` : `${a.type} (${a.id.slice(0, 8)}…)`
  }

  /**
   * Human label for level.
   * Note: DB value is "org" — we display it as "Organization".
   */
  function levelLabel(level: string): string {
    switch (level) {
      case "federal":
        return "Federal"
      case "org":
        return "Organization" // ← was "organization" (wrong)
      case "branch":
        return "Branch"
      case "department":
        return "Department"
      default:
        return level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  function levelColor(level: string): string {
    switch (level) {
      case "federal":
        return "lvl-federal"
      case "org":
        return "lvl-org" // ← was "organization"
      case "branch":
        return "lvl-branch"
      case "department":
        return "lvl-dept"
      default:
        return "lvl-default"
    }
  }

  function scopeName(scope_id: string | null): string {
    if (!scope_id) return "Global"
    const org = data.organizations.find((o) => o.id === scope_id)
    if (org) return org.name
    const branch = data.branches.find((b) => b.id === scope_id)
    if (branch) return branch.name
    return scope_id.slice(0, 8) + "…"
  }

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
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  // ── Filtered list — FIX: now uses selectedLevel too ──────────
  let filtered = $derived(
    data.jurisdictions.filter((j) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        actorLabel(j).toLowerCase().includes(q) ||
        j.level?.toLowerCase().includes(q) ||
        scopeName(j.scope_id).toLowerCase().includes(q)

      // FIX: selectedLevel filter was declared but never applied
      const matchesLevel = !selectedLevel || j.level === selectedLevel

      return matchesSearch && matchesLevel
    }),
  )

  // Level options — values MUST match JURISDICTION_LEVELS in auth.store.ts
  const levelOptions = [
    { value: "federal", label: "Federal" },
    { value: "org", label: "Organization" }, // ← "org" not "organization"
    { value: "branch", label: "Branch" },
    { value: "department", label: "Department" },
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
          width="15"
          height="15"
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

    <!-- Load warnings (non-fatal) -->
    {#each data.loadWarnings as warning}
      <div class="pg-warning">
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
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" /><line
            x1="12"
            y1="17"
            x2="12.01"
            y2="17"
          />
        </svg>
        {warning}
      </div>
    {/each}

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
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <polyline points="22 8.5 12 15.5 2 8.5" />
          </svg>
        </div>
        <div>
          <h1 class="pg-title">Jurisdictions</h1>
          <p class="pg-subtitle">
            Manage actor scope boundaries and authority levels
          </p>
        </div>
      </div>
      <div class="pg-header-actions">
        <span class="pg-count-badge">
          <span class="pg-count-num">{data.jurisdictions.length}</span> assigned
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
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Assign Jurisdiction
        </button>
      </div>
    </header>

    <!-- Action error (from form submission fail()) -->
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

    <!-- Create form panel -->
    {#if showCreate}
      <div class="pg-create-panel pg-slide-in">
        <p class="pg-create-hint">
          Levels stored in DB: <code>federal</code> · <code>org</code> ·
          <code>branch</code>
          · <code>department</code>
        </p>
        <form
          method="post"
          action="?/create"
          use:enhance
          class="pg-create-form"
        >
          <div class="pg-create-grid">
            <!-- Actor -->
            <div class="pg-form-group">
              <label class="pg-label" for="actor_id_select">Actor</label>
              <div class="pg-select-wrap">
                <select
                  name="actor_id"
                  id="actor_id_select"
                  required
                  class="pg-select"
                >
                  <option value="">Choose an actor…</option>
                  {#each data.actors as a}
                    <option value={a.id}>{actorOptionLabel(a)}</option>
                  {/each}
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

            <!-- Level — values match JURISDICTION_LEVELS -->
            <div class="pg-form-group">
              <label class="pg-label" for="level_select">Level</label>
              <div class="pg-select-wrap">
                <select
                  name="level"
                  id="level_select"
                  required
                  class="pg-select"
                  onchange={(e) =>
                    (selectedLevel = (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Choose level…</option>
                  {#each levelOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
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

            <!-- Scope (conditional) -->
            {#if selectedLevel === "org" || selectedLevel === "branch" || selectedLevel === "department"}
              <div
                class="pg-form-group pg-slide-in"
                style="grid-column: 1 / -1"
              >
                <label class="pg-label">
                  Scope — {selectedLevel === "org" ? "Organization" : "Branch"}
                </label>
                <div class="pg-select-wrap">
                  <select name="scope_id" required class="pg-select">
                    <option value="">Select scope…</option>
                    {#if selectedLevel === "org"}
                      {#each data.organizations as o}
                        <option value={o.id}>
                          {o.name}{o.status !== "active" ? " (pending)" : ""}
                        </option>
                      {/each}
                    {:else}
                      {#each data.branches as b}
                        <option value={b.id}>{b.name}</option>
                      {/each}
                    {/if}
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
            {/if}
          </div>
          <div class="pg-create-actions">
            <button
              type="button"
              class="pg-btn-cancel"
              onclick={() => {
                showCreate = false
                selectedLevel = ""
              }}
            >
              Cancel
            </button>
            <button type="submit" class="pg-btn-submit">Assign</button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Search + level filter -->
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
          placeholder="Search by actor, level, or scope…"
          class="pg-search-input"
        />
      </div>

      <!-- Level filter chips — FIX: now actually filters the list -->
      <div class="pg-level-chips">
        <button
          type="button"
          class="pg-chip"
          class:pg-chip-active={selectedLevel === ""}
          onclick={() => (selectedLevel = "")}
        >
          All
        </button>
        {#each levelOptions as opt}
          <button
            type="button"
            class="pg-chip pg-chip-{opt.value}"
            class:pg-chip-active={selectedLevel === opt.value}
            onclick={() =>
              (selectedLevel = selectedLevel === opt.value ? "" : opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Empty state -->
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
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          </svg>
        </div>
        <h2 class="pg-empty-title">
          {searchQuery || selectedLevel
            ? "No matches"
            : "No jurisdictions assigned"}
        </h2>
        <p class="pg-empty-text">
          {searchQuery || selectedLevel
            ? "Try clearing the search or level filter."
            : "Assign jurisdictions to define actor authority scope."}
        </p>
      </div>
    {:else}
      <div class="pg-list">
        {#each filtered as j, i}
          <div class="pg-card" style="animation-delay: {i * 50}ms">
            <div class="pg-card-row">
              <!-- Left: actor info -->
              <div class="pg-card-main">
                <div class="pg-card-top">
                  <!-- Avatar -->
                  <div class="pg-avatar">
                    {#if j.actors?.profiles?.avatar_url}
                      <img
                        src={j.actors.profiles.avatar_url}
                        alt={actorLabel(j)}
                        class="pg-avatar-img"
                      />
                    {:else}
                      <span class="pg-avatar-initials">
                        {initials(j.actors?.profiles?.full_name ?? null)}
                      </span>
                    {/if}
                  </div>
                  <span class="pg-actor-name">{actorLabel(j)}</span>
                  <span class="pg-level-tag {levelColor(j.level)}">
                    {levelLabel(j.level)}
                  </span>
                </div>

                <div class="pg-card-details">
                  <div class="pg-detail">
                    <span class="pg-detail-label">Scope</span>
                    <span class="pg-detail-value">{scopeName(j.scope_id)}</span>
                  </div>
                  {#if j.created_at}
                    <div class="pg-detail">
                      <span class="pg-detail-label">Assigned</span>
                      <span class="pg-detail-value"
                        >{timeAgo(j.created_at)}</span
                      >
                    </div>
                  {/if}
                  <div class="pg-detail">
                    <span class="pg-detail-label">DB Level</span>
                    <code class="pg-detail-code">{j.level}</code>
                  </div>
                </div>

                <div class="pg-id-row">
                  <span class="pg-id-label">ID</span>
                  <code class="pg-id-value">{j.id}</code>
                </div>
              </div>

              <!-- Right: delete -->
              <div class="pg-card-actions">
                {#if confirmDeleteId === j.id}
                  <form
                    method="post"
                    action="?/delete"
                    use:enhance
                    class="pg-inline-form pg-slide-in"
                  >
                    <input type="hidden" name="id" value={j.id} />
                    <button type="submit" class="pg-btn-danger-confirm"
                      >Remove</button
                    >
                    <button
                      type="button"
                      class="pg-btn-cancel-sm"
                      onclick={() => (confirmDeleteId = null)}
                    >
                      Cancel
                    </button>
                  </form>
                {:else}
                  <button
                    class="pg-btn-danger"
                    onclick={() => (confirmDeleteId = j.id)}
                    title="Remove jurisdiction"
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
      rgba(45, 212, 191, 0.06) 0%,
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
  .pg-warning {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 1rem;
    margin-bottom: 0.75rem;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.15);
    border-radius: 9px;
    font-size: 0.82rem;
    color: #fcd34d;
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
      rgba(45, 212, 191, 0.15),
      rgba(45, 212, 191, 0.05)
    );
    border: 1px solid rgba(45, 212, 191, 0.2);
    color: #5eead4;
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
    background: linear-gradient(135deg, #5eead4, #2dd4bf);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s,
      box-shadow 0.2s;
  }
  .pg-btn-create:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(45, 212, 191, 0.3);
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
    margin-bottom: 1.25rem;
  }

  /* Create panel */
  .pg-create-panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(45, 212, 191, 0.15);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .pg-create-hint {
    font-size: 0.75rem;
    color: #555a6e;
    margin: 0 0 1rem;
  }
  .pg-create-hint code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #5eead4;
    background: rgba(45, 212, 191, 0.08);
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

  /* Toolbar: search + level chips */
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
    border-color: rgba(45, 212, 191, 0.3);
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

  /* Level filter chips */
  .pg-level-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .pg-chip {
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
  .pg-chip-federal.pg-chip-active {
    color: #fbbf24 !important;
    background: rgba(251, 191, 36, 0.12) !important;
    border-color: rgba(251, 191, 36, 0.25) !important;
  }
  .pg-chip-org.pg-chip-active {
    color: #c084fc !important;
    background: rgba(192, 132, 252, 0.12) !important;
    border-color: rgba(192, 132, 252, 0.25) !important;
  }
  .pg-chip-branch.pg-chip-active {
    color: #60a5fa !important;
    background: rgba(96, 165, 250, 0.12) !important;
    border-color: rgba(96, 165, 250, 0.25) !important;
  }
  .pg-chip-department.pg-chip-active {
    color: #a5b4fc !important;
    background: rgba(165, 180, 252, 0.12) !important;
    border-color: rgba(165, 180, 252, 0.25) !important;
  }

  /* Empty */
  .pg-empty {
    text-align: center;
    padding: 4rem 2rem;
  }
  .pg-empty-icon {
    color: #5eead4;
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

  /* Card list */
  .pg-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .pg-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    animation: pg-card-in 0.4s ease-out both;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  .pg-card:hover {
    border-color: rgba(45, 212, 191, 0.15);
    box-shadow:
      0 0 0 1px rgba(45, 212, 191, 0.05),
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

  .pg-card-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  .pg-card-main {
    flex: 1;
    min-width: 0;
  }
  .pg-card-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }

  /* Avatar */
  .pg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(45, 212, 191, 0.12);
    border: 1px solid rgba(45, 212, 191, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .pg-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pg-avatar-initials {
    font-size: 0.65rem;
    font-weight: 700;
    color: #5eead4;
  }

  .pg-actor-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f0f1f4;
  }
  .pg-level-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .lvl-federal {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }
  .lvl-org {
    color: #c084fc;
    background: rgba(192, 132, 252, 0.1);
  }
  .lvl-branch {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }
  .lvl-dept {
    color: #a5b4fc;
    background: rgba(165, 180, 252, 0.1);
  }
  .lvl-default {
    color: #8b8fa3;
    background: rgba(139, 143, 163, 0.08);
  }

  .pg-card-details {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  .pg-detail {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .pg-detail-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555a6e;
    font-weight: 500;
  }
  .pg-detail-value {
    font-size: 0.82rem;
    color: #c8cbd3;
  }
  .pg-detail-code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    color: #5eead4;
    background: rgba(45, 212, 191, 0.08);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
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

  /* Actions */
  .pg-card-actions {
    flex-shrink: 0;
    padding-top: 0.15rem;
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
    border-color: rgba(45, 212, 191, 0.4);
    box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.08);
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
    background: linear-gradient(135deg, #5eead4, #2dd4bf);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s,
      box-shadow 0.2s;
  }
  .pg-btn-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(45, 212, 191, 0.25);
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
      padding: 1rem;
    }
    .pg-card-details {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
