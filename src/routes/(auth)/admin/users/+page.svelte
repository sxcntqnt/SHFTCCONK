<script lang="ts">
  type Data = {
    profiles: any[]
    actorsByProfile: Record<string, any[]>
    orgMembershipsByProfile: Record<string, any[]>
    error?: string
    success?: boolean
  }
  let { data }: { data: Data } = $props()

  let searchQuery = $state("")
  let editingId: string | null = $state(null)

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
    switch (type) {
      case "driver":
        return "at-driver"
      case "conductor":
        return "at-conductor"
      case "fleet_owner":
        return "at-fleet"
      case "passenger":
        return "at-passenger"
      case "stage_operator":
        return "at-operator"
      default:
        return "at-default"
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
        (data.actorsByProfile[p.id] || []).some((a: any) =>
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
              cx="9"
              cy="7"
              r="4"
            />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path
              d="M16 3.13a4 4 0 0 1 0 7.75"
            />
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
        <span class="pg-count-badge">
          <span class="pg-count-num">{data.profiles.length}</span> users
        </span>
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

    <!-- Search -->
    <div class="pg-search-bar">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
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
        placeholder="Search by name, company, role…"
        class="pg-search-input"
      />
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
            ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
              cx="9"
              cy="7"
              r="4"
            /></svg
          >
        </div>
        <h2 class="pg-empty-title">
          {searchQuery ? "No matches" : "No users yet"}
        </h2>
        <p class="pg-empty-text">
          {searchQuery
            ? "Try a different search term."
            : "Users will appear here once profiles are created."}
        </p>
      </div>
    {:else}
      <div class="pg-list">
        {#each filtered as p, i}
          {@const actors = data.actorsByProfile[p.id] || []}
          {@const memberships = data.orgMembershipsByProfile[p.id] || []}
          <div class="pg-card" style="animation-delay: {i * 45}ms">
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
                  <h3 class="pg-user-name">{p.full_name || "Unnamed User"}</h3>
                  <div class="pg-user-meta">
                    {#if p.company_name}
                      <span class="pg-company">{p.company_name}</span>
                    {/if}
                    {#if p.created_at}
                      <span class="pg-joined"
                        >Joined {timeAgo(p.created_at)}</span
                      >
                    {/if}
                  </div>
                </div>
              </div>
              <button
                class="pg-btn-edit"
                onclick={() => (editingId = editingId === p.id ? null : p.id)}
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
                  /><path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
              </button>
            </div>

            <!-- Actor roles -->
            {#if actors.length > 0}
              <div class="pg-actor-list">
                {#each actors as a}
                  <div class="pg-actor-chip {actorTypeColor(a.type)}">
                    <span class="pg-actor-type"
                      >{a.type.replace(/_/g, " ")}</span
                    >
                    {#if a.status && a.status !== "active"}
                      <span class="pg-actor-status">({a.status})</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <div class="pg-no-actors">No actor roles assigned</div>
            {/if}

            <!-- Org memberships -->
            {#if memberships.length > 0}
              <div class="pg-memberships">
                {#each memberships as m}
                  <div class="pg-membership-chip">
                    <span class="pg-org-name"
                      >{m.organizations?.name ||
                        m.organization_id.slice(0, 8)}</span
                    >
                    <span class="pg-org-role">{m.role}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Edit form -->
            {#if editingId === p.id}
              <form
                method="post"
                action="?/update_profile"
                class="pg-edit-form pg-slide-in"
              >
                <input type="hidden" name="id" value={p.id} />
                <div class="pg-edit-grid">
                  <div class="pg-form-group">
                    <label class="pg-label">Full Name</label>
                    <input
                      name="full_name"
                      value={p.full_name || ""}
                      class="pg-input"
                      placeholder="Full name"
                    />
                  </div>
                  <div class="pg-form-group">
                    <label class="pg-label">Company</label>
                    <input
                      name="company_name"
                      value={p.company_name || ""}
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

            <!-- Footer: ID + details -->
            <div class="pg-card-footer">
              <div class="pg-id-row">
                <span class="pg-id-label">UID</span>
                <code class="pg-id-value">{p.id}</code>
              </div>
              <div class="pg-footer-meta">
                {#if p.unsubscribed}
                  <span class="pg-unsub-tag">Unsubscribed</span>
                {/if}
                <span class="pg-perm-ver">v{p.permissions_version}</span>
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
    line-height: 1.2;
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
    border-color: rgba(251, 191, 36, 0.12);
    box-shadow:
      0 0 0 1px rgba(251, 191, 36, 0.04),
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

  /* ── User header ── */
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
    letter-spacing: 0.02em;
  }
  .pg-user-info {
    min-width: 0;
  }
  .pg-user-name {
    font-size: 1rem;
    font-weight: 600;
    color: #f0f1f4;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
      background 0.15s ease,
      color 0.15s ease;
  }
  .pg-btn-edit:hover {
    background: rgba(251, 191, 36, 0.08);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.15);
  }

  /* ── Actor chips ── */
  .pg-actor-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .pg-actor-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    text-transform: capitalize;
  }
  .pg-actor-status {
    font-weight: 400;
    opacity: 0.7;
  }
  .at-driver {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }
  .at-conductor {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.1);
  }
  .at-fleet {
    color: #34d399;
    background: rgba(52, 211, 153, 0.1);
  }
  .at-passenger {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }
  .at-operator {
    color: #f472b6;
    background: rgba(244, 114, 182, 0.1);
  }
  .at-default {
    color: #8b8fa3;
    background: rgba(139, 143, 163, 0.08);
  }

  .pg-no-actors {
    font-size: 0.78rem;
    color: #44475a;
    font-style: italic;
    margin-bottom: 0.75rem;
  }

  /* ── Org memberships ── */
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
    font-weight: 400;
    text-transform: capitalize;
  }

  /* ── Edit form ── */
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

  /* ── Footer ── */
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

  /* ── Shared form elements ── */
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
    border-color: rgba(251, 191, 36, 0.4);
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.08);
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
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }
  .pg-btn-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(251, 191, 36, 0.25);
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
  }
</style>
