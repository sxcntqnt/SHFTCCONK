<!-- src/routes/(auth)/onboarding/[intent]/pending/+page.svelte -->
<!--
  Pending verification — polls on every page visit.
  Client-side auto-refresh every 8 seconds.
  Server redirects on kyc_status change.
-->
<script lang="ts">
  import { onMount } from "svelte"
  import { fade } from "svelte/transition"
  import { invalidateAll } from "$app/navigation"

  let { data } = $props<{
    data: {
      intent: string
      kycStatus: string
      isPassenger: boolean
    }
  }>()

  // Intent-specific pending messaging
  const PENDING_META: Record<
    string,
    {
      title: string
      body: string
      eta: string
      note?: string
      color: string
    }
  > = {
    passenger: {
      title: "Verifying your identity",
      body: "Our verification partner is reviewing your documents. This usually takes a few minutes.",
      eta: "Typically 2–5 minutes",
      color: "var(--teal)",
    },
    crew: {
      title: "Verifying your credentials",
      body: "We're cross-checking your details with the NTSA PSV registry. Once approved, your SACCO will activate your account.",
      eta: "Typically 10–30 minutes",
      note: "You'll receive an SMS once your SACCO activates your account.",
      color: "#a78bfa",
    },
    operator: {
      title: "Verifying operator credentials",
      body: "Your NTSA operator licence is being verified. Once cleared, your assigned SACCO will grant fleet access.",
      eta: "Typically 10–30 minutes",
      color: "#38bdf8",
    },
    owner: {
      title: "Verifying ownership documents",
      body: "Your vehicle logbook and NTSA certificate are being reviewed.",
      eta: "Typically 15–60 minutes",
      note: "Physical documents may require manual review.",
      color: "#facc15",
    },
    org: {
      title: "Verifying organisation registration",
      body: "Your company documents and NTSA SACCO licence are being verified.",
      eta: "Typically 1–4 hours",
      note: "Organisation registration may require manual review by our team.",
      color: "var(--orange)",
    },
  }

  const meta = PENDING_META[data.intent] ?? PENDING_META.passenger

  // Auto-poll every 8 seconds
  onMount(() => {
    const interval = setInterval(async () => {
      await invalidateAll()
    }, 8000)

    return () => clearInterval(interval)
  })

  // Pulse animation step for the status dots
  let tick = $state(0)
  onMount(() => {
    const t = setInterval(() => (tick = (tick + 1) % 3), 600)
    return () => clearInterval(t)
  })
</script>

<svelte:head>
  <title>Verification Pending — Matatu Pulse</title>
</svelte:head>

<div class="onboard-card" in:fade={{ duration: 200 }}>
  <div
    class="card-line"
    aria-hidden="true"
    style="--line-color: {meta.color}"
  ></div>

  <!-- ── Status icon ────────────────────────────────────────────────────── -->
  <div class="status-icon" style="--icon-color: {meta.color}">
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  </div>

  <h1 class="title">{meta.title}</h1>
  <p class="body">{meta.body}</p>

  <!-- ── Pulsing status indicator ──────────────────────────────────────── -->
  <div class="status-row" aria-live="polite">
    <div class="dots">
      {#each [0, 1, 2] as i}
        <div
          class="dot {tick === i ? 'active' : ''}"
          style="--dot-color: {meta.color}"
        ></div>
      {/each}
    </div>
    <span class="status-label">Checking verification status…</span>
  </div>

  <!-- ── ETA + note ─────────────────────────────────────────────────────── -->
  <div class="info-block">
    <div class="info-row">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{meta.eta}</span>
    </div>

    {#if meta.note}
      <div class="info-row note">
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
        <span>{meta.note}</span>
      </div>
    {/if}
  </div>

  <!-- ── What happens next ──────────────────────────────────────────────── -->
  <div class="next-block">
    <div class="next-label">What happens next</div>
    {#if data.isPassenger}
      <ol class="next-steps">
        <li>Verification completes (usually minutes)</li>
        <li>Your account is activated automatically</li>
        <li>You're redirected to complete your profile</li>
      </ol>
    {:else}
      <ol class="next-steps">
        <li>Verification completes (see ETA above)</li>
        <li>Your actor account is created with <em>pending</em> status</li>
        <li>Your organisation activates your account</li>
        <li>You receive an SMS confirmation</li>
        <li>You can access your role dashboard</li>
      </ol>
    {/if}
  </div>

  <!-- ── Safe to close note ─────────────────────────────────────────────── -->
  <div class="safe-note">
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
    Safe to close this page — you'll be redirected automatically when verification
    is complete.
  </div>
</div>

<style>
  .onboard-card {
    width: 100%;
    max-width: 480px;
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    position: relative;
    text-align: center;
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
      color-mix(in srgb, var(--line-color, var(--orange)) 60%, transparent),
      transparent
    );
  }

  .status-icon {
    width: 68px;
    height: 68px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--icon-color) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--icon-color) 22%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--icon-color);
    margin: 0 auto 24px;
    box-shadow: 0 0 32px color-mix(in srgb, var(--icon-color) 15%, transparent);
  }

  .title {
    font-family: var(--font-display);
    font-size: clamp(1.3rem, 3vw, 1.7rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .body {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.65;
    margin-bottom: 28px;
  }

  /* ── Status row ── */
  .status-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    transition:
      background 0.2s,
      transform 0.2s;
  }
  .dot.active {
    background: var(--dot-color);
    transform: scale(1.3);
  }
  .status-label {
    font-size: 0.72rem;
    color: var(--text-3);
    font-weight: 600;
  }

  /* ── Info block ── */
  .info-block {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 24px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 0.78rem;
    color: var(--text-2);
  }
  .info-row svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--text-3);
  }
  .info-row.note {
    color: var(--text-3);
  }

  /* ── Next steps ── */
  .next-block {
    text-align: left;
    margin-bottom: 24px;
  }
  .next-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }
  .next-steps {
    padding-left: 18px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .next-steps li {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
  }
  .next-steps li em {
    font-style: normal;
    color: var(--orange);
    font-weight: 600;
  }

  /* ── Safe note ── */
  .safe-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 0.68rem;
    color: var(--text-3);
    opacity: 0.6;
  }
  .safe-note svg {
    color: var(--teal);
    flex-shrink: 0;
  }

  @media (max-width: 520px) {
    .onboard-card {
      padding: 28px 20px;
    }
  }
</style>
