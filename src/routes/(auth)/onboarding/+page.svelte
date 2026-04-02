<!-- src/routes/(auth)/onboarding/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms"
  import { fade, fly } from "svelte/transition"

  let { form } = $props<{ form?: { message?: string } }>()

  let loading = $state(false)

  const INVITE_ONLY_ROLES = [
    {
      label: "Driver",
      group: "Crew",
      description: "Invited by a registered SACCO.",
      color: "#a78bfa",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    },
    {
      label: "Conductor",
      group: "Crew",
      description: "Invited by a registered SACCO.",
      color: "#fb923c",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>`,
    },
    {
      label: "Operator",
      group: "Operations",
      description: "Approved by ORG_CHAIR per org.",
      color: "#38bdf8",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    },
    {
      label: "Vehicle Owner",
      group: "Asset Owner",
      description: "Onboarded via SACCO invitation.",
      color: "#facc15",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
    },
    {
      label: "SACCO / Organisation",
      group: "Organisation",
      description: "Register via our partner programme.",
      color: "#f26522",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    },
    {
      label: "SACCO Staff",
      group: "Organisation",
      description: "Managers, accountants, mechanics.",
      color: "#34d399",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M7 8h10"/></svg>`,
    },
  ]
</script>

<svelte:head>
  <title>Get Started — Matatu Pulse</title>
</svelte:head>

<div class="onboard-card" in:fade={{ duration: 220 }}>
  <!-- Top accent line -->
  <div class="card-shimmer" aria-hidden="true"></div>

  <!-- Brand mark -->
  <div class="brand-mark">
    <span class="brand-dot"></span>
    <span class="brand-name">Matatu<span>Pulse</span></span>
  </div>

  <!-- Heading -->
  <h1 class="title">How are you<br /><em>joining?</em></h1>
  <p class="sub">
    Passengers can register directly. All other roles are assigned by registered
    SACCOs and organisations.
  </p>

  <!-- ── Open Registration ──────────────────────────────────────── -->
  <div class="section-label">
    <span class="label-line"></span>
    <span>Open Registration</span>
    <span class="label-line"></span>
  </div>

  <form
    method="POST"
    action="?/setIntent"
    use:enhance={() => {
      loading = true
      return async ({ update }) => {
        await update()
        loading = false
      }
    }}
  >
    <input type="hidden" name="intent" value="passenger" />

    <button type="submit" class="passenger-card" disabled={loading}>
      <!-- Teal glow blob -->
      <div class="p-glow" aria-hidden="true"></div>

      <div class="card-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <div class="card-body">
        <div class="card-title">Passenger</div>
        <div class="card-desc">
          Book seats, track matatus, and pay fares digitally. Requires identity
          verification.
        </div>
        <div class="kyc-badge">
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Identity verification required
        </div>
      </div>

      <div class="card-arrow">
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
        {:else}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        {/if}
      </div>
    </button>
  </form>

  {#if form?.message}
    <div class="error-banner" role="alert" in:fly={{ y: 6, duration: 180 }}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {form.message}
    </div>
  {/if}

  <!-- ── Invite-only roles ──────────────────────────────────────── -->
  <div class="section-label" style="margin-top: 26px;">
    <span class="label-line"></span>
    <span>
      Invite Only
      <span class="section-hint">· assigned by your org</span>
    </span>
    <span class="label-line"></span>
  </div>

  <div class="invite-grid">
    {#each INVITE_ONLY_ROLES as role, i}
      <div
        class="invite-card"
        in:fly={{ y: 10, duration: 200, delay: 60 + i * 35 }}
        style="--role-color: {role.color}"
      >
        <div class="invite-icon">
          {@html role.icon}
        </div>
        <div class="invite-info">
          <div class="invite-name">{role.label}</div>
          <div class="invite-desc">{role.description}</div>
        </div>
        <div class="lock-badge" aria-label="Invite required">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      </div>
    {/each}
  </div>

  <!-- Redeem link -->
  <div class="redeem-row">
    <div class="redeem-inner">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      Already have an invite link?
      <a href="/auth/redeem" class="redeem-link">Redeem your invite →</a>
    </div>
  </div>
</div>

<style>
  /* ════════════════════════════════════
     CARD SHELL
  ════════════════════════════════════ */
  @property --beam-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes beam-spin {
    to {
      --beam-angle: 360deg;
    }
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.35);
    }
  }

  .onboard-card {
    width: 100%;
    max-width: 540px;
    background: rgba(16, 16, 26, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 26px;
    padding: 38px 42px 32px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.03),
      0 40px 96px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(20px);
  }

  /* Travelling orange beam along top edge */
  .card-shimmer {
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: conic-gradient(
      from var(--beam-angle) at 50% 0%,
      transparent 0deg,
      transparent 120deg,
      rgba(242, 101, 34, 0.15) 165deg,
      rgba(242, 101, 34, 0.9) 178deg,
      rgba(255, 180, 100, 1) 180deg,
      rgba(242, 101, 34, 0.9) 182deg,
      rgba(242, 101, 34, 0.15) 195deg,
      transparent 240deg,
      transparent 360deg
    );
    animation: beam-spin 5s linear infinite;
  }

  /* ── Brand mark ── */
  .brand-mark {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 28px;
  }
  .brand-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--teal, #00b09b);
    box-shadow:
      0 0 8px rgba(0, 176, 155, 0.8),
      0 0 20px rgba(0, 176, 155, 0.3);
    animation: pulse-dot 2.4s ease-in-out infinite;
  }
  .brand-name {
    font-family: var(--font-display, "Syne", sans-serif);
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-2, #9996a8);
  }
  .brand-name span {
    color: var(--orange, #f26522);
  }

  /* ── Heading ── */
  .title {
    font-family: var(--font-display, "Syne", sans-serif);
    font-size: clamp(1.7rem, 4vw, 2.15rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.08;
    color: var(--text-1, #f0eee8);
    margin-bottom: 12px;
  }
  .title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522 30%, #ff9f5a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sub {
    font-size: 0.855rem;
    color: var(--text-3, #605d70);
    line-height: 1.65;
    margin-bottom: 28px;
  }

  /* ════════════════════════════════════
     SECTION DIVIDERS
  ════════════════════════════════════ */
  .section-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.59rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3, #605d70);
    margin-bottom: 12px;
    white-space: nowrap;
  }
  .label-line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
  }
  .section-hint {
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: none;
    opacity: 0.7;
  }

  /* ════════════════════════════════════
     PASSENGER CARD
  ════════════════════════════════════ */
  .passenger-card {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 22px;
    background: rgba(0, 176, 155, 0.055);
    border: 1px solid rgba(0, 176, 155, 0.18);
    border-radius: 18px;
    cursor: pointer;
    font-family: var(--font-body, "DM Sans", sans-serif);
    text-align: left;
    overflow: hidden;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    margin-bottom: 0;
  }
  .passenger-card:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.095);
    border-color: rgba(0, 176, 155, 0.32);
    transform: translateY(-2px);
    box-shadow: 0 12px 36px rgba(0, 176, 155, 0.12);
  }
  .passenger-card:active:not(:disabled) {
    transform: translateY(0);
  }
  .passenger-card:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  /* Ambient teal glow inside card */
  .p-glow {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.14),
      transparent 70%
    );
    pointer-events: none;
  }

  .card-icon {
    position: relative;
    z-index: 1;
    width: 50px;
    height: 50px;
    border-radius: 15px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--teal, #00b09b);
    transition:
      background 0.2s,
      border-color 0.2s;
  }
  .passenger-card:hover .card-icon {
    background: rgba(0, 176, 155, 0.16);
    border-color: rgba(0, 176, 155, 0.35);
  }

  .card-body {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
  }
  .card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1, #f0eee8);
    margin-bottom: 3px;
  }
  .card-desc {
    font-size: 0.75rem;
    color: var(--text-3, #605d70);
    line-height: 1.5;
    margin-bottom: 9px;
  }

  .kyc-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.57rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--teal, #00b09b);
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.16);
    padding: 2px 8px;
    border-radius: 100px;
  }

  .card-arrow {
    position: relative;
    z-index: 1;
    color: var(--teal, #00b09b);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition:
      opacity 0.2s,
      transform 0.2s;
  }
  .passenger-card:hover .card-arrow {
    opacity: 1;
    transform: translateX(2px);
  }

  /* ════════════════════════════════════
     ERROR BANNER
  ════════════════════════════════════ */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 12px;
    font-size: 0.77rem;
    color: #f87171;
    margin-top: 12px;
  }

  /* ════════════════════════════════════
     INVITE GRID
  ════════════════════════════════════ */
  .invite-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 20px;
  }

  .invite-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
    background: rgba(255, 255, 255, 0.018);
    border: 1px solid rgba(255, 255, 255, 0.055);
    border-radius: 13px;
    transition:
      background 0.2s,
      border-color 0.2s;
    cursor: default;
  }
  .invite-card:hover {
    background: rgba(255, 255, 255, 0.032);
    border-color: color-mix(in srgb, var(--role-color) 20%, transparent);
  }

  .invite-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--role-color) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--role-color) 16%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--role-color);
    transition: background 0.2s;
  }
  .invite-card:hover .invite-icon {
    background: color-mix(in srgb, var(--role-color) 14%, transparent);
  }

  .invite-info {
    flex: 1;
    min-width: 0;
  }
  .invite-name {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-2, #9996a8);
    margin-bottom: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .invite-desc {
    font-size: 0.6rem;
    color: var(--text-3, #605d70);
    line-height: 1.4;
  }

  .lock-badge {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3, #605d70);
  }

  /* ════════════════════════════════════
     REDEEM ROW
  ════════════════════════════════════ */
  .redeem-row {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 18px;
    margin-top: 4px;
  }
  .redeem-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--text-3, #605d70);
  }
  .redeem-inner svg {
    opacity: 0.5;
    flex-shrink: 0;
  }
  .redeem-link {
    color: var(--orange, #f26522);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.15s;
  }
  .redeem-link:hover {
    opacity: 0.8;
  }

  /* ════════════════════════════════════
     SPINNER
  ════════════════════════════════════ */
  .spinner {
    display: block;
    width: 15px;
    height: 15px;
    border: 2px solid rgba(0, 176, 155, 0.25);
    border-top-color: var(--teal, #00b09b);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }

  /* ════════════════════════════════════
     RESPONSIVE
  ════════════════════════════════════ */
  @media (max-width: 520px) {
    .onboard-card {
      padding: 28px 22px 26px;
    }
    .invite-grid {
      grid-template-columns: 1fr;
    }
    .redeem-inner {
      flex-wrap: wrap;
      justify-content: center;
      text-align: center;
    }
  }
</style>
