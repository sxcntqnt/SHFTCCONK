<!-- src/routes/(auth)/onboarding/+page.svelte -->
<!--
  Intent picker — self-registration entry point.

  SHOWS:
    - Passenger as the only self-selectable role
    - All other roles displayed as "invite required" so users
      understand the system without hitting a dead end

  DOES NOT show a multi-role selector — that was the old model.
  Org-assigned roles cannot be self-declared.
-->
<script lang="ts">
  import { enhance } from "$app/forms"
  import { fade, fly } from "svelte/transition"

  let { form } = $props<{ form?: { message?: string } }>()

  let loading = $state(false)

  // Roles that require an org invitation — displayed as locked cards
  // so users understand the ecosystem without confusion
  const INVITE_ONLY_ROLES = [
    {
      label: "Driver",
      group: "Crew",
      description: "Invited by a registered SACCO.",
      color: "#a78bfa",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    },
    {
      label: "Conductor",
      group: "Crew",
      description: "Invited by a registered SACCO.",
      color: "#fb923c",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>`,
    },
    {
      label: "Operator",
      group: "Operations",
      description: "Approved by ORG_CHAIR per org.",
      color: "#38bdf8",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    },
    {
      label: "Vehicle Owner",
      group: "Asset Owner",
      description: "Onboarded via SACCO invitation.",
      color: "#facc15",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
    },
    {
      label: "SACCO / Organisation",
      group: "Organisation",
      description: "Register your SACCO via our partner programme.",
      color: "var(--orange)",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    },
    {
      label: "SACCO Staff",
      group: "Organisation",
      description: "Fleet managers, accountants, mechanics and more.",
      color: "#34d399",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M7 8h10"/></svg>`,
    },
  ]
</script>

<svelte:head>
  <title>Get Started — Matatu Pulse</title>
</svelte:head>

<div class="onboard-card">
  <div class="card-line" aria-hidden="true"></div>

  <div in:fade={{ duration: 200 }}>
    <div class="eyebrow">Welcome to Matatu Pulse</div>
    <h1 class="title">How are you<br /><em>joining?</em></h1>
    <p class="sub">
      Passengers can register directly. All other roles are assigned by
      registered SACCOs and organisations.
    </p>

    <!-- ── Passenger — self-registration ──────────────────────────────────── -->
    <div class="section-label">Open Registration</div>

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
        <div class="card-icon" style="color: var(--teal)">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div class="card-body">
          <div class="card-title">Passenger</div>
          <div class="card-desc">
            Book seats, track matatus, and pay fares digitally. Requires
            identity verification.
          </div>
          <div class="kyc-badge">
            <svg
              width="10"
              height="10"
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
              width="16"
              height="16"
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
          width="13"
          height="13"
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

    <!-- ── Invite-only roles ───────────────────────────────────────────────── -->
    <div class="section-label" style="margin-top: 28px">
      Invite Only
      <span class="section-hint">Assigned by your organisation</span>
    </div>

    <div class="invite-grid">
      {#each INVITE_ONLY_ROLES as role}
        <div class="invite-card">
          <div class="invite-icon" style="color: {role.color}">
            {@html role.icon}
          </div>
          <div class="invite-info">
            <div class="invite-name">{role.label}</div>
            <div class="invite-desc">{role.description}</div>
          </div>
          <div class="lock-icon" aria-label="Invite required">
            <svg
              width="11"
              height="11"
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

    <div class="invite-note">
      Already have an invite link?
      <a href="/auth/redeem" class="invite-link">Redeem your invite →</a>
    </div>
  </div>
</div>

<style>
  .onboard-card {
    width: 100%;
    max-width: 560px;
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 24px;
    padding: 36px 40px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    position: relative;
    overflow: hidden;
  }
  .card-line {
    position: absolute;
    top: 0;
    left: 32px;
    right: 32px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.6),
      transparent
    );
  }

  .eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
  }
  .title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3.5vw, 2.1rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
    margin-bottom: 28px;
  }

  /* ── Section labels ── */
  .section-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-hint {
    font-weight: 500;
    opacity: 0.6;
    letter-spacing: 0.05em;
    text-transform: none;
    font-size: 0.62rem;
  }

  /* ── Passenger card ── */
  .passenger-card {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: rgba(0, 176, 155, 0.06);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 16px;
    cursor: pointer;
    font-family: var(--font-body);
    text-align: left;
    transition:
      background 0.18s,
      border-color 0.18s,
      transform 0.14s;
    margin-bottom: 0;
  }
  .passenger-card:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.35);
    transform: translateY(-1px);
  }
  .passenger-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .card-body {
    flex: 1;
    min-width: 0;
  }
  .card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .card-desc {
    font-size: 0.75rem;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 8px;
  }
  .kyc-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.18);
    padding: 2px 7px;
    border-radius: 100px;
  }
  .card-arrow {
    color: var(--teal);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  /* ── Invite grid ── */
  .invite-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }
  .invite-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    opacity: 0.65;
  }
  .invite-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .invite-info {
    flex: 1;
    min-width: 0;
  }
  .invite-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-2);
    margin-bottom: 1px;
  }
  .invite-desc {
    font-size: 0.62rem;
    color: var(--text-3);
    line-height: 1.4;
  }
  .lock-icon {
    color: var(--text-3);
    opacity: 0.5;
    flex-shrink: 0;
  }

  /* ── Invite note ── */
  .invite-note {
    font-size: 0.75rem;
    color: var(--text-3);
    text-align: center;
    padding-top: 4px;
  }
  .invite-link {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.15s;
  }
  .invite-link:hover {
    opacity: 0.8;
  }

  /* ── Error ── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 10px;
    font-size: 0.78rem;
    color: #f87171;
    margin-top: 12px;
  }

  /* ── Spinner ── */
  .spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(0, 176, 155, 0.3);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: block;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 520px) {
    .onboard-card {
      padding: 28px 20px;
    }
    .invite-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
