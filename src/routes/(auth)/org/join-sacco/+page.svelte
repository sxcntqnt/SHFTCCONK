<script lang="ts">
  /**
   * /org/join-sacco/+page.svelte
   *
   * REPLACED: join-code input flow
   * WITH: browse list of pending_activation SACCOs
   *
   * KEY BEHAVIOURS:
   *   - Shows all orgs with status = 'pending_activation'
   *   - Orgs the user has already requested show as "Requested" (disabled)
   *   - Preselected org from ?org_id= is highlighted and auto-scrolled to
   *   - Unverified users can still submit — they visit the org office for verification
   *   - Form submits to ?/join → server validates → redirects to /org/join-success
   */

  import { enhance } from "$app/forms"
  import { onMount } from "svelte"

  type Org = {
    id: string
    name: string
    metadata: Record<string, unknown> | null
    created_at: string
  }

  type Data = {
    orgs: Org[]
    existingRequestOrgIds: string[]
    isAlreadyChair: boolean
    preselectedOrgId: string | null
    isLoggedIn: boolean
  }

  let { data, form }: { data: Data; form: { error?: string } | null } = $props()

  let searchQuery = $state("")
  let selectedOrg: Org | null = $state(
    data.preselectedOrgId
      ? (data.orgs.find((o) => o.id === data.preselectedOrgId) ?? null)
      : null,
  )
  let submitting = $state(false)

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return "today"
    if (days === 1) return "yesterday"
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  function hasRequested(orgId: string): boolean {
    return data.existingRequestOrgIds.includes(orgId)
  }

  let filtered = $derived(
    data.orgs.filter(
      (o) =>
        !searchQuery ||
        o.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  )

  // Scroll preselected org into view on mount
  onMount(() => {
    if (data.preselectedOrgId) {
      const el = document.getElementById(`org-${data.preselectedOrgId}`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  })
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="js-root">
  <div class="js-bg"></div>

  <div class="js-container">
    <!-- Header -->
    <header class="js-header">
      <div class="js-logo">
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
        <h1 class="js-title">Join a SACCO</h1>
        <p class="js-subtitle">
          Select your organization to register as its chairperson
        </p>
      </div>
    </header>

    <!-- Info banner -->
    <div class="js-info-banner">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <strong>You will need to visit the SACCO office</strong> after submitting
        to verify your identity and complete onboarding. sxcntqnt will contact you
        once your request is reviewed.
      </div>
    </div>

    <!-- Already a chair warning -->
    {#if data.isAlreadyChair}
      <div class="js-warn-banner">
        <svg
          width="15"
          height="15"
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
        You are already an active ORG_CHAIR. Submitting another request is allowed
        but will require admin review.
      </div>
    {/if}

    <!-- Action error -->
    {#if form?.error}
      <div class="js-error">
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
        {form.error}
      </div>
    {/if}

    <!-- Empty state (no pending orgs) -->
    {#if data.orgs.length === 0}
      <div class="js-empty">
        <div class="js-empty-icon">
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
        <h2 class="js-empty-title">No SACCOs available</h2>
        <p class="js-empty-text">
          There are no organizations currently accepting new chairs.<br />
          Contact sxcntqnt to register your SACCO.
        </p>
        <a href="mailto:hello@sxcntqnt.com" class="js-contact-link"
          >Contact sxcntqnt →</a
        >
      </div>
    {:else}
      <!-- Search -->
      <div class="js-search-bar">
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
          placeholder="Search SACCOs…"
          class="js-search-input"
        />
        <span class="js-search-count">{filtered.length} available</span>
      </div>

      <!-- Org list -->
      <div class="js-org-list">
        {#each filtered as org}
          {@const requested = hasRequested(org.id)}
          {@const isSelected = selectedOrg?.id === org.id}

          <button
            id={"org-" + org.id}
            type="button"
            class="js-org-card"
            class:js-org-card-selected={isSelected}
            class:js-org-card-requested={requested}
            disabled={requested}
            onclick={() => {
              if (!requested) selectedOrg = isSelected ? null : org
            }}
          >
            <!-- Org icon -->
            <div class="js-org-icon" class:js-org-icon-selected={isSelected}>
              <svg
                width="18"
                height="18"
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

            <!-- Org info -->
            <div class="js-org-info">
              <span class="js-org-name">{org.name}</span>
              <span class="js-org-meta">
                Registered {timeAgo(org.created_at)} · Awaiting chairperson
              </span>
            </div>

            <!-- State indicator -->
            <div class="js-org-state">
              {#if requested}
                <span class="js-badge-requested">Requested</span>
              {:else if isSelected}
                <div class="js-check">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              {:else}
                <div class="js-circle"></div>
              {/if}
            </div>
          </button>
        {/each}

        {#if filtered.length === 0 && searchQuery}
          <div class="js-no-results">No SACCOs match "{searchQuery}"</div>
        {/if}
      </div>

      <!-- Submit panel (slides up when org selected) -->
      {#if selectedOrg}
        <div class="js-submit-panel js-slide-up">
          <div class="js-submit-info">
            <div class="js-submit-label">Joining as ORG_CHAIR of</div>
            <div class="js-submit-org">{selectedOrg.name}</div>
          </div>

          <form
            method="post"
            action="?/join"
            use:enhance={() => {
              submitting = true
              return async ({ update }) => {
                await update()
                submitting = false
              }
            }}
            class="js-submit-form"
          >
            <input type="hidden" name="org_id" value={selectedOrg.id} />

            {#if !data.isLoggedIn}
              <p class="js-login-prompt">
                <a
                  href="/login/sign_in?redirect=/org/join-sacco"
                  class="js-login-link"
                >
                  Sign in to submit your request →
                </a>
              </p>
            {:else}
              <button type="submit" class="js-btn-submit" disabled={submitting}>
                {#if submitting}
                  <span class="js-spinner"></span>
                  Submitting…
                {:else}
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Join Request
                {/if}
              </button>
            {/if}
          </form>

          <p class="js-submit-note">
            Your request will be reviewed by sxcntqnt. You will receive an SMS
            or email once approved.
          </p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
    margin: 0;
  }

  .js-root {
    min-height: 100vh;
    background: #0c0e13;
    color: #e2e4e9;
    padding: 2rem 1rem 6rem;
    position: relative;
    overflow: hidden;
  }
  .js-bg {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(
        ellipse at 40% 0%,
        rgba(168, 85, 247, 0.05) 0%,
        transparent 60%
      ),
      radial-gradient(
        ellipse at 80% 80%,
        rgba(96, 165, 250, 0.04) 0%,
        transparent 60%
      );
    pointer-events: none;
  }
  .js-container {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
  }

  /* Header */
  .js-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .js-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.15),
      rgba(168, 85, 247, 0.05)
    );
    border: 1px solid rgba(168, 85, 247, 0.2);
    color: #c084fc;
    flex-shrink: 0;
  }
  .js-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0;
  }
  .js-subtitle {
    font-size: 0.83rem;
    color: #6b7084;
    margin: 0.15rem 0 0;
  }

  /* Banners */
  .js-info-banner {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.9rem 1rem;
    margin-bottom: 1rem;
    background: rgba(96, 165, 250, 0.06);
    border: 1px solid rgba(96, 165, 250, 0.14);
    border-radius: 12px;
    font-size: 0.82rem;
    color: #93c5fd;
    line-height: 1.5;
  }
  .js-info-banner svg {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
  .js-warn-banner {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    padding: 0.8rem 1rem;
    margin-bottom: 1rem;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.15);
    border-radius: 12px;
    font-size: 0.8rem;
    color: #fcd34d;
    line-height: 1.5;
  }
  .js-error {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.8rem 1rem;
    margin-bottom: 1.25rem;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    font-size: 0.85rem;
    color: #f87171;
  }

  /* Empty */
  .js-empty {
    text-align: center;
    padding: 4rem 1rem;
  }
  .js-empty-icon {
    color: #c084fc;
    opacity: 0.5;
    margin-bottom: 1.2rem;
  }
  .js-empty-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #d1d5db;
    margin: 0 0 0.5rem;
  }
  .js-empty-text {
    font-size: 0.88rem;
    color: #6b7084;
    margin: 0 0 1.25rem;
    line-height: 1.6;
  }
  .js-contact-link {
    font-size: 0.85rem;
    color: #c084fc;
    text-decoration: none;
    font-weight: 600;
  }
  .js-contact-link:hover {
    text-decoration: underline;
  }

  /* Search */
  .js-search-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 0.65rem 1rem;
    margin-bottom: 1rem;
    color: #555a6e;
  }
  .js-search-bar:focus-within {
    border-color: rgba(168, 85, 247, 0.3);
  }
  .js-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 0.85rem;
    color: #c8cbd3;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .js-search-input::placeholder {
    color: #44475a;
  }
  .js-search-count {
    font-size: 0.72rem;
    color: #555a6e;
    white-space: nowrap;
  }

  /* Org list */
  .js-org-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .js-org-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    width: 100%;
    text-align: left;
    padding: 1rem 1.1rem;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;
  }
  .js-org-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(168, 85, 247, 0.2);
  }
  .js-org-card-selected {
    background: rgba(168, 85, 247, 0.07) !important;
    border-color: rgba(168, 85, 247, 0.35) !important;
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.08);
  }
  .js-org-card-requested {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .js-org-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #6b7084;
    flex-shrink: 0;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .js-org-icon-selected {
    background: rgba(168, 85, 247, 0.12);
    border-color: rgba(168, 85, 247, 0.2);
    color: #c084fc;
  }

  .js-org-info {
    flex: 1;
    min-width: 0;
  }
  .js-org-name {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f0f1f4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .js-org-meta {
    display: block;
    font-size: 0.72rem;
    color: #555a6e;
    margin-top: 0.15rem;
  }

  .js-org-state {
    flex-shrink: 0;
  }
  .js-badge-requested {
    font-size: 0.68rem;
    font-weight: 600;
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
    border: 1px solid rgba(96, 165, 250, 0.18);
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
  }
  .js-check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(168, 85, 247, 0.15);
    border: 2px solid #c084fc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c084fc;
  }
  .js-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }

  .js-no-results {
    text-align: center;
    font-size: 0.85rem;
    color: #44475a;
    padding: 2rem;
  }

  /* Submit panel */
  .js-submit-panel {
    position: sticky;
    bottom: 1.5rem;
    background: rgba(15, 16, 22, 0.95);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  }
  .js-submit-info {
    margin-bottom: 1rem;
  }
  .js-submit-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555a6e;
    font-weight: 600;
  }
  .js-submit-org {
    font-size: 1.05rem;
    font-weight: 700;
    color: #f0f1f4;
    margin-top: 0.2rem;
  }

  .js-submit-form {
    display: flex;
    flex-direction: column;
  }

  .js-login-prompt {
    text-align: center;
    font-size: 0.85rem;
    color: #6b7084;
    margin: 0;
  }
  .js-login-link {
    color: #c084fc;
    font-weight: 600;
    text-decoration: none;
  }
  .js-login-link:hover {
    text-decoration: underline;
  }

  .js-btn-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #c084fc, #a855f7);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.12s;
    letter-spacing: 0.01em;
  }
  .js-btn-submit:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .js-btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .js-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(12, 14, 19, 0.3);
    border-top-color: #0c0e13;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .js-submit-note {
    font-size: 0.72rem;
    color: #44475a;
    text-align: center;
    margin: 0.75rem 0 0;
    line-height: 1.5;
  }

  .js-slide-up {
    animation: slide-up 0.3s ease-out;
  }
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .js-root {
      padding: 1.25rem 0.75rem 5rem;
    }
    .js-submit-panel {
      border-radius: 12px;
      padding: 1rem;
    }
  }
</style>
