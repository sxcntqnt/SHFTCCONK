<!-- src/routes/(auth)/org/select/+page.svelte -->
<script lang="ts">
  import { goto } from "$app/navigation"
  import { setActiveOperatorOrg } from "$lib/features/auth/contexts"

  interface Org {
    organizationId: string
    orgName: string
    role: string | null
    memberRole: string | null
  }

  interface Props {
    data: {
      orgs: Org[]
      reason: string | null
    }
  }

  let { data }: Props = $props()
  const { orgs, reason } = data

  // ── Reason messaging ──────────────────────────────────────────────────────
  const REASON_MESSAGES: Record<string, { title: string; sub: string }> = {
    no_access: {
      title: "Access Restricted",
      sub: "You don't have access to that organisation. Select one below.",
    },
    insufficient_permissions: {
      title: "Switch Organisation",
      sub: "You need a different organisation context to continue.",
    },
  }

  const reasonMsg = reason ? (REASON_MESSAGES[reason] ?? null) : null

  // ── Role display ──────────────────────────────────────────────────────────
  const ROLE_LABELS: Record<string, string> = {
    ORG_CHAIR: "Chair",
    GENERAL_MANAGER: "General Manager",
    FLEET_MANAGER: "Fleet Manager",
    OPERATIONS_MANAGER: "Operations",
    SECRETARY: "Secretary",
    ACCOUNTANT: "Accountant",
    MECHANIC: "Mechanic",
    DISPATCHER: "Dispatcher",
    DRIVER: "Driver",
    CONDUCTOR: "Conductor",
  }

  function roleLabel(role: string | null): string {
    if (!role) return "Member"
    return (
      ROLE_LABELS[role] ??
      role
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
  }

  // ── Search ────────────────────────────────────────────────────────────────
  let search = $state("")

  let filtered = $derived(
    search.trim()
      ? orgs.filter((o) =>
          o.orgName.toLowerCase().includes(search.toLowerCase()),
        )
      : orgs,
  )

  // ── Select ────────────────────────────────────────────────────────────────
  let selecting = $state<string | null>(null)

  async function selectOrg(orgId: string) {
    selecting = orgId
    // Navigate — the /org/[orgId]/+layout.ts activates the right context
    await goto(`/org/${orgId}/dashboard`)
  }
</script>

<svelte:head>
  <title>Select Organisation — Matatu Pulse</title>
</svelte:head>

<div class="page">
  <div class="card">
    <!-- Header -->
    <div class="card-header">
      <div class="logo-mark">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
        >
          <rect x="1" y="3" width="15" height="13" />
          <path d="M16 8h4l3 3v5h-7z" />
        </svg>
      </div>

      {#if reasonMsg}
        <div class="reason-badge">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {reasonMsg.title}
        </div>
        <h1 class="title">{reasonMsg.sub}</h1>
      {:else}
        <h1 class="title">Select Organisation</h1>
        <p class="subtitle">
          You have access to {orgs.length} organisations. Which would you like to
          work in?
        </p>
      {/if}
    </div>

    <!-- Search (only if > 4 orgs) -->
    {#if orgs.length > 4}
      <div class="search-wrap">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          opacity="0.4"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search organisations…"
          class="search-input"
          bind:value={search}
          autofocus
        />
        {#if search}
          <button class="search-clear" onclick={() => (search = "")}>✕</button>
        {/if}
      </div>
    {/if}

    <!-- Org list -->
    <div class="org-list">
      {#if filtered.length === 0}
        <div class="empty">
          <div class="empty-title">No results for "{search}"</div>
        </div>
      {:else}
        {#each filtered as org}
          {@const isSelecting = selecting === org.organizationId}
          <button
            class="org-row {isSelecting ? 'selecting' : ''}"
            onclick={() => selectOrg(org.organizationId)}
            disabled={selecting !== null}
          >
            <!-- Org avatar -->
            <div class="org-av">
              {org.orgName.slice(0, 2).toUpperCase()}
            </div>

            <!-- Info -->
            <div class="org-info">
              <div class="org-name">{org.orgName}</div>
              <div class="org-role">{roleLabel(org.role)}</div>
            </div>

            <!-- Chevron / spinner -->
            <div class="org-action">
              {#if isSelecting}
                <span class="spin"></span>
              {:else}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="card-footer">
      Not seeing your organisation?
      <a href="/app/dashboard">Go to dashboard</a>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    font-family: var(--font-body);
  }

  .card {
    width: 100%;
    max-width: 440px;
    background: var(--ink-2);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  }

  /* ── Header ── */
  .card-header {
    padding: 32px 32px 20px;
    border-bottom: 1px solid var(--rim);
    text-align: center;
    background: linear-gradient(
      160deg,
      rgba(0, 176, 155, 0.07),
      transparent 60%
    );
    position: relative;
  }
  .card-header::before {
    content: "";
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 176, 155, 0.35),
      transparent
    );
  }

  .logo-mark {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--teal), #005c52);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 4px 14px rgba(0, 176, 155, 0.3);
  }

  .reason-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 100px;
    margin-bottom: 10px;
    background: rgba(250, 204, 21, 0.08);
    border: 1px solid rgba(250, 204, 21, 0.22);
    font-size: 0.62rem;
    font-weight: 700;
    color: #facc15;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .title {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 6px;
    line-height: 1.25;
  }
  .subtitle {
    font-size: 0.8rem;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* ── Search ── */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 20px 0;
    padding: 9px 13px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 11px;
  }
  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-body);
    font-size: 0.84rem;
    color: var(--text-1);
  }
  .search-input::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }
  .search-clear {
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    font-size: 0.72rem;
    opacity: 0.6;
    padding: 0 2px;
    transition: opacity 0.15s;
  }
  .search-clear:hover {
    opacity: 1;
  }

  /* ── Org list ── */
  .org-list {
    padding: 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 360px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  }

  .org-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px;
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-body);
    transition:
      background 0.12s,
      border-color 0.12s,
      transform 0.12s;
    width: 100%;
  }
  .org-row:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(0, 176, 155, 0.2);
    transform: translateX(2px);
  }
  .org-row.selecting {
    border-color: rgba(0, 176, 155, 0.3);
    background: rgba(0, 176, 155, 0.06);
  }
  .org-row:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .org-av {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    flex-shrink: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 176, 155, 0.25),
      rgba(0, 176, 155, 0.08)
    );
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.78rem;
    font-weight: 900;
    color: var(--teal);
    letter-spacing: -0.02em;
  }

  .org-info {
    flex: 1;
    min-width: 0;
  }
  .org-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .org-role {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--teal);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-top: 2px;
    opacity: 0.8;
  }

  .org-action {
    color: var(--text-3);
    flex-shrink: 0;
  }

  /* ── Empty ── */
  .empty {
    padding: 24px;
    text-align: center;
    font-size: 0.82rem;
    color: var(--text-3);
  }
  .empty-title {
    font-weight: 600;
    color: var(--text-2);
  }

  /* ── Footer ── */
  .card-footer {
    padding: 14px 32px 20px;
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-3);
    border-top: 1px solid var(--rim);
  }
  .card-footer a {
    color: var(--teal);
    text-decoration: none;
    font-weight: 600;
  }
  .card-footer a:hover {
    text-decoration: underline;
  }

  /* ── Spinner ── */
  .spin {
    display: block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 176, 155, 0.2);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
