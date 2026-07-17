<!-- src/routes/(auth)/onboarding/[intent]/+page.svelte -->
<!--
  Ballerine KYC page — serves all intents.

  PASSENGER:   kyc_light — basic ID + selfie
  CREW:        kyc_full_ntsa — NTSA PSV licence + ID
  OPERATOR:    kyc_full_ntsa — NTSA operator licence + ID
  OWNER:       kyc_full_ntsa — vehicle ownership docs + ID
  ORG:         kyc_full_ntsa — company registration + director ID

  Ballerine SDK renders as a web component inside the card.
  On completion, SDK fires a custom event — we capture caseId
  and submit via the hidden form to ?/submitKyc.
-->
<script lang="ts">
  import { onMount } from "svelte"
  import { enhance } from "$app/forms"
  import { fade, fly } from "svelte/transition"

  let { data, form } = $props<{
    data: {
      intent: string
      workflowId: string
      isRetry: boolean
      isPassenger: boolean
      isProWorkflow: boolean
      ballerine: {
        workflowId: string
        token: string
      }
    }
    form?: { message?: string }
  }>()

  // ── Intent display metadata ───────────────────────────────────────────────
  const INTENT_META: Record<
    string,
    {
      label: string
      description: string
      color: string
      docs: string[]
      group: string
    }
  > = {
    passenger: {
      label: "Passenger",
      group: "Traveller",
      description:
        "We need to verify your identity to keep the platform safe and compliant.",
      color: "var(--teal, #00b09b)",
      docs: ["National ID or Passport", "A clear selfie photo"],
    },
    crew: {
      label: "Crew Member",
      group: "Driver / Conductor",
      description:
        "NTSA requires identity and licence verification for all crew members.",
      color: "#a78bfa",
      docs: [
        "National ID or Passport",
        "NTSA PSV Licence",
        "Certificate of Good Conduct (within 1 year)",
        "A clear selfie photo",
      ],
    },
    operator: {
      label: "Operator",
      group: "Stage Operator",
      description:
        "NTSA requires verification for operators managing vehicle allocations.",
      color: "#38bdf8",
      docs: [
        "National ID or Passport",
        "NTSA Operator Licence",
        "A clear selfie photo",
      ],
    },
    owner: {
      label: "Vehicle Owner",
      group: "Asset Owner",
      description:
        "Fleet ownership verification requires NTSA and ownership documentation.",
      color: "#facc15",
      docs: [
        "National ID or Passport",
        "Vehicle Logbook (C3 / C4)",
        "NTSA Inspection Certificate",
        "A clear selfie photo",
      ],
    },
    org: {
      label: "SACCO / Organisation",
      group: "Organisation",
      description:
        "Organisation registration requires director identity and company documents.",
      color: "var(--orange, #f26522)",
      docs: [
        "Director National ID or Passport",
        "Certificate of Registration / Incorporation",
        "KRA PIN Certificate",
        "NTSA SACCO Operating Licence",
      ],
    },
  }

  const meta = INTENT_META[data.intent] ?? INTENT_META.passenger

  // ── Ballerine SDK state ───────────────────────────────────────────────────
  let sdkReady = $state(false)
  let sdkCompleted = $state(false)
  let sdkError = $state<string | null>(null)
  let capturedCaseId = $state<string | null>(null)
  let submitting = $state(false)
  let alreadySubmitted = false // 🔹 prevent double submission

  // Hidden form reference — submitted programmatically after SDK completes
  let submitForm: HTMLFormElement

  async function handleBallerineComplete(event: CustomEvent) {
    if (alreadySubmitted) return // 🔹 skip if already submitted
    alreadySubmitted = true // mark as submitted
    const { caseId } = event.detail ?? {}
    if (!caseId) return (sdkError = "No case ID returned")

    capturedCaseId = caseId
    sdkCompleted = true
    submitting = true

    try {
      const res = await fetch("?/submitKyc", {
        method: "POST",
        body: new URLSearchParams({ ballerineCaseId: caseId }),
      })

      submitting = false

      if (res.ok) {
        // Navigate to pending page after successful submission
        window.location.href = `/onboarding/${data.intent}/pending`
      } else {
        sdkError = "Failed to submit verification. Try again."
      }
    } catch (err) {
      submitting = false
      sdkError = "Verification submission failed. Try again."
    }
  }
  onMount(() => {
    // Load Ballerine web component SDK
    const script = document.createElement("script")
    script.src = "https://cdn.ballerine.io/1.1.22/ballerine-sdk.umd.min.js"
    script.onload = () => {
      sdkReady = true
    }
    script.onerror = () => {
      sdkError = "Failed to load verification service."
    }
    document.head.appendChild(script)

    // Listen for Ballerine completion event
    window.addEventListener("ballerine.complete", handleBallerineComplete)
    window.addEventListener("ballerine.error", handleBallerineError)

    return () => {
      window.removeEventListener("ballerine.complete", handleBallerineComplete)
      window.removeEventListener("ballerine.error", handleBallerineError)
    }
  })

  function handleBallerineError(event: CustomEvent) {
    sdkError =
      event.detail?.message ??
      "Verification encountered an error. Please try again."
  }
</script>

<svelte:head>
  <title>Verify Your Identity — Matatu Pulse</title>
</svelte:head>

<div class="onboard-card" in:fade={{ duration: 220 }}>
  <!-- Top accent line — travelling beam, matches onboarding shell -->
  <div class="card-shimmer" aria-hidden="true" style="--beam-color: {meta.color}"></div>

  <!-- Brand mark -->
  <div class="brand-mark">
    <span class="brand-dot"></span>
    <span class="brand-name">Matatu<span>Pulse</span></span>
  </div>

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div class="intent-badge" style="--badge-color: {meta.color}">
    {meta.group}
  </div>

  {#if data.isRetry}
    <div class="retry-banner" in:fly={{ y: -8, duration: 200 }}>
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
      Your previous verification was not approved. Please try again with clear,
      valid documents.
    </div>
  {/if}

  <h1 class="title">Verify Your<br /><em>Identity</em></h1>
  <p class="sub">{meta.description}</p>

  <!-- ── Documents required ────────────────────────────────────────────── -->
  <div class="section-label">
    <span class="label-line"></span>
    <span>Documents You'll Need</span>
    <span class="label-line"></span>
  </div>

  <div class="docs-block">
    <ul class="docs-list">
      {#each meta.docs as doc}
        <li>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {doc}
        </li>
      {/each}
    </ul>
  </div>

  <!-- ── Ballerine SDK embed ────────────────────────────────────────────── -->
  <div class="sdk-wrapper">
    {#if sdkError}
      <div class="sdk-error" in:fly={{ y: 6, duration: 180 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <div class="sdk-error-title">Verification Unavailable</div>
          <div class="sdk-error-body">{sdkError}</div>
          <button
            type="button"
            class="retry-btn"
            onclick={() => {
              sdkError = null
              window.location.reload()
            }}
          >
            Try again
          </button>
        </div>
      </div>
    {:else if sdkCompleted}
      <div class="sdk-success" in:fade={{ duration: 200 }}>
        <div class="success-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="success-title">Verification submitted</div>
        <div class="success-body">Submitting your application…</div>
        <span class="spinner" aria-hidden="true"></span>
      </div>
    {:else if !sdkReady}
      <div class="sdk-loading">
        <span class="spinner" aria-hidden="true"></span>
        <span>Loading verification…</span>
      </div>
    {:else}
      <!-- Ballerine web component — renders the KYC flow inline -->
      <!-- svelte-ignore unknown-compiler-option -->
      <ballerine-flows
        flow-name={data.workflowId}
        token={data.ballerine.token}
        style="width: 100%; min-height: 480px;"
      ></ballerine-flows>
    {/if}
  </div>

  <!-- ── Hidden submit form ─────────────────────────────────────────────── -->
  <!-- Submitted programmatically by handleBallerineComplete -->
  <form
    method="POST"
    action="?/submitKyc"
    bind:this={submitForm}
    use:enhance={() => {
      return async ({ update }) => {
        await update()
        submitting = false
      }
    }}
  >
    <input
      type="hidden"
      name="ballerineCaseId"
      value={capturedCaseId ?? ""}
    />
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

  <!-- ── NTSA compliance note ───────────────────────────────────────────── -->
  {#if data.isProWorkflow}
    <div class="compliance-note">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      Verified against the NTSA operator registry. Data processed in accordance
      with Kenya's Data Protection Act, 2019.
    </div>
  {/if}
</div>

<style>
  /* ════════════════════════════════════
     CARD SHELL — matches onboarding intent-selection page
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
    max-width: 580px;
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

  /* Travelling beam along top edge, tinted by the active intent's color */
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
      color-mix(in srgb, var(--beam-color, #f26522) 15%, transparent) 165deg,
      color-mix(in srgb, var(--beam-color, #f26522) 90%, transparent) 178deg,
      color-mix(in srgb, var(--beam-color, #f26522) 100%, white 25%) 180deg,
      color-mix(in srgb, var(--beam-color, #f26522) 90%, transparent) 182deg,
      color-mix(in srgb, var(--beam-color, #f26522) 15%, transparent) 195deg,
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

  /* ── Intent badge ── */
  .intent-badge {
    display: inline-flex;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--badge-color, var(--orange, #f26522));
    background: color-mix(
      in srgb,
      var(--badge-color, var(--orange, #f26522)) 10%,
      transparent
    );
    border: 1px solid
      color-mix(in srgb, var(--badge-color, var(--orange, #f26522)) 22%, transparent);
    padding: 2px 8px;
    border-radius: 100px;
    margin-bottom: 14px;
  }

  /* ── Retry banner ── */
  .retry-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 12px;
    font-size: 0.78rem;
    color: #f87171;
    margin-bottom: 16px;
    line-height: 1.5;
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

  /* ════════════════════════════════════
     DOCS BLOCK
  ════════════════════════════════════ */
  .docs-block {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 24px;
  }
  .docs-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .docs-list li {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 0.8rem;
    color: var(--text-2, #9996a8);
    font-family: var(--font-body, "DM Sans", sans-serif);
  }
  .docs-list li svg {
    color: var(--teal, #00b09b);
    flex-shrink: 0;
  }

  /* ════════════════════════════════════
     SDK WRAPPER
  ════════════════════════════════════ */
  .sdk-wrapper {
    min-height: 200px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.02);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sdk-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 48px;
    color: var(--text-3, #605d70);
    font-size: 0.8rem;
    font-family: var(--font-body, "DM Sans", sans-serif);
  }
  .sdk-error {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 24px;
    color: #f87171;
  }
  .sdk-error-title {
    font-weight: 700;
    font-size: 0.875rem;
    margin-bottom: 4px;
    color: var(--text-1, #f0eee8);
  }
  .sdk-error-body {
    font-size: 0.78rem;
    color: var(--text-3, #605d70);
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .retry-btn {
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--orange, #f26522);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 8px;
    padding: 6px 14px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .retry-btn:hover {
    background: rgba(242, 101, 34, 0.18);
  }

  .sdk-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 48px;
    text-align: center;
  }
  .success-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal, #00b09b);
    margin-bottom: 4px;
  }
  .success-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1, #f0eee8);
  }
  .success-body {
    font-size: 0.8rem;
    color: var(--text-3, #605d70);
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
    margin-bottom: 16px;
  }

  /* ════════════════════════════════════
     COMPLIANCE NOTE
  ════════════════════════════════════ */
  .compliance-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 0.65rem;
    color: var(--text-3, #605d70);
    line-height: 1.5;
    opacity: 0.7;
  }
  .compliance-note svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ════════════════════════════════════
     SPINNER
  ════════════════════════════════════ */
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--teal, #00b09b);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: block;
  }

  /* ════════════════════════════════════
     RESPONSIVE
  ════════════════════════════════════ */
  @media (max-width: 520px) {
    .onboard-card {
      padding: 28px 22px 26px;
    }
  }
</style>
