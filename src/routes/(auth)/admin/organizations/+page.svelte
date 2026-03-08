<script lang="ts">
  type Data = {
    organizations: any[]
    memberCounts: Record<string, number>
    branchCounts: Record<string, number>
    vehicleCounts: Record<string, number>
    error?: string
    success?: boolean
  }
  let { data }: { data: Data } = $props()

  let showCreate = $state(false)
  let confirmDeleteId: string | null = $state(null)
  let searchQuery = $state("")

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
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  function statusColor(status: string): string {
    switch (status) {
      case "active":
        return "ar-status-active"
      case "suspended":
        return "ar-status-suspended"
      case "inactive":
        return "ar-status-inactive"
      default:
        return "ar-status-default"
    }
  }

  let filtered = $derived(
    data.organizations.filter(
      (o) =>
        o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id?.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
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
    <!-- Header -->
    <header class="pg-header">
      <div class="pg-header-left">
        <div
          class="pg-icon-badge"
          style="background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05)); border-color: rgba(168,85,247,0.2); color: #c084fc;"
        >
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
              points="9 22 9 12 15 12 15 22"
            />
          </svg>
        </div>
        <div>
          <h1 class="pg-title">Organizations</h1>
          <p class="pg-subtitle">
            Manage registered organizations and their structure
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
            ><line x1="12" y1="5" x2="12" y2="19" /><line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            /></svg
          >
          New Organization
        </button>
      </div>
    </header>

    {#if data.error}
      <div class="pg-error">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><circle cx="12" cy="12" r="10" /><line
            x1="15"
            y1="9"
            x2="9"
            y2="15"
          /><line x1="9" y1="9" x2="15" y2="15" /></svg
        >
        <span>{data.error}</span>
      </div>
    {/if}

    <!-- Create form -->
    {#if showCreate}
      <div class="pg-create-panel pg-slide-in">
        <form method="post" action="?/create" class="pg-create-form">
          <div class="pg-create-grid">
            <div class="pg-form-group">
              <label class="pg-label">Organization Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Metro Transit Co."
                class="pg-input"
              />
            </div>
            <div class="pg-form-group">
              <label class="pg-label">Status</label>
              <div class="pg-select-wrap">
                <select name="status" class="pg-select">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <svg
                  class="pg-select-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg
                >
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

    <!-- Search -->
    <div class="pg-search-bar">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><circle cx="11" cy="11" r="8" /><line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
        /></svg
      >
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search organizations…"
        class="pg-search-input"
      />
    </div>

    <!-- Empty -->
    {#if filtered.length === 0}
      <div class="pg-empty">
        <div class="pg-empty-icon" style="color: #c084fc;">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            ><path
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            /><polyline points="9 22 9 12 15 12 15 22" /></svg
          >
        </div>
        <h2 class="pg-empty-title">
          {searchQuery ? "No matches" : "No organizations yet"}
        </h2>
        <p class="pg-empty-text">
          {searchQuery
            ? "Try a different search term."
            : "Create your first organization to get started."}
        </p>
      </div>
    {:else}
      <div class="pg-list">
        {#each filtered as org, i}
          <div class="pg-card" style="animation-delay: {i * 50}ms">
            <div class="pg-card-header">
              <div class="pg-card-title-row">
                <h3 class="pg-card-name">{org.name}</h3>
                <span
                  class="pg-status-tag {statusColor(org.status || 'active')}"
                >
                  <span class="pg-status-dot"></span>
                  {org.status || "active"}
                </span>
              </div>
              {#if org.created_at}
                <span class="pg-time">Created {timeAgo(org.created_at)}</span>
              {/if}
            </div>

            <!-- Stats row -->
            <div class="pg-stats-row">
              <div class="pg-stat">
                <span class="pg-stat-num">{data.memberCounts[org.id] || 0}</span
                >
                <span class="pg-stat-label">Members</span>
              </div>
              <div class="pg-stat">
                <span class="pg-stat-num">{data.branchCounts[org.id] || 0}</span
                >
                <span class="pg-stat-label">Branches</span>
              </div>
              <div class="pg-stat">
                <span class="pg-stat-num"
                  >{data.vehicleCounts[org.id] || 0}</span
                >
                <span class="pg-stat-label">Vehicles</span>
              </div>
            </div>

            <!-- Metadata -->
            {#if org.metadata && typeof org.metadata === "object" && Object.keys(org.metadata).length > 0}
              <div class="pg-meta-row">
                {#each Object.entries(org.metadata) as [key, val]}
                  <div class="pg-meta-chip">
                    <span class="pg-meta-key">{key}</span>
                    <span class="pg-meta-val">{val}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- ID + actions -->
            <div class="pg-card-footer">
              <div class="pg-id-row">
                <span class="pg-id-label">ID</span>
                <code class="pg-id-value">{org.id}</code>
              </div>
              <div class="pg-card-actions">
                {#if confirmDeleteId === org.id}
                  <form method="post" action="?/delete" class="pg-inline-form">
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
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><polyline points="3 6 5 6 21 6" /><path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      /></svg
                    >
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
  /* ── Shared Foundation (matches actor_requests) ── */
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

  /* ── Header ── */
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
    border: 1px solid;
    flex-shrink: 0;
  }
  .pg-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0;
    line-height: 1.2;
  }
  .pg-subtitle {
    font-size: 0.85rem;
    color: #6b7084;
    margin: 0.2rem 0 0;
    font-weight: 400;
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
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }
  .pg-btn-create:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
  }

  /* ── Error ── */
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

  /* ── Create panel ── */
  .pg-create-panel {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(168, 85, 247, 0.15);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
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

  /* ── Search ── */
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
    transition: border-color 0.15s ease;
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

  /* ── Empty ── */
  .pg-empty {
    text-align: center;
    padding: 4rem 2rem;
  }
  .pg-empty-icon {
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

  /* ── Cards ── */
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
    backdrop-filter: blur(12px);
    animation: pg-card-in 0.4s ease-out both;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
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

  /* ── Status tags ── */
  .pg-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
    border: 1px solid;
    text-transform: capitalize;
  }
  .pg-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .ar-status-active {
    color: #6ee7a0;
    background: rgba(110, 231, 160, 0.08);
    border-color: rgba(110, 231, 160, 0.15);
  }
  .ar-status-active .pg-status-dot {
    background: #6ee7a0;
  }
  .ar-status-suspended {
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
    border-color: rgba(248, 113, 113, 0.15);
  }
  .ar-status-suspended .pg-status-dot {
    background: #f87171;
  }
  .ar-status-inactive {
    color: #8b8fa3;
    background: rgba(139, 143, 163, 0.08);
    border-color: rgba(139, 143, 163, 0.15);
  }
  .ar-status-inactive .pg-status-dot {
    background: #8b8fa3;
  }
  .ar-status-default {
    color: #a5b4fc;
    background: rgba(99, 132, 255, 0.08);
    border-color: rgba(99, 132, 255, 0.15);
  }
  .ar-status-default .pg-status-dot {
    background: #a5b4fc;
  }

  /* ── Stats ── */
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

  /* ── Metadata ── */
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

  /* ── Footer / ID ── */
  .pg-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
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
  }

  /* ── Buttons ── */
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
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
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

  /* ── Shared form ── */
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
    transition: border-color 0.15s ease;
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
    transition: border-color 0.15s ease;
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
      transform 0.12s ease,
      box-shadow 0.2s ease;
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
  }
</style>
