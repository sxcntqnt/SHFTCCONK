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
      color: "var(--teal)",
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
      color: "var(--orange)",
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
  let alreadySubmitted = false; // 🔹 prevent double submission

  // Hidden form reference — submitted programmatically after SDK completes
  let submitForm: HTMLFormElement


    async function handleBallerineComplete(event: CustomEvent) {
    if (alreadySubmitted) return; // 🔹 skip if already submitted
  alreadySubmitted = true;      // mark as submitted
    const { caseId } = event.detail ?? {};
    if (!caseId) return sdkError = "No case ID returned";

    capturedCaseId = caseId;
    sdkCompleted = true;
    submitting = true;

    try {
        const res = await fetch('?/submitKyc', {
            method: 'POST',
            body: new URLSearchParams({ ballerineCaseId: caseId }),
        });

        submitting = false;

        if (res.ok) {
            // Navigate to pending page after successful submission
            window.location.href = `/onboarding/${data.intent}/pending`;
        } else {
            sdkError = 'Failed to submit verification. Try again.';
        }
    } catch (err) {
        submitting = false;
        sdkError = 'Verification submission failed. Try again.';
    }
}
  onMount(() => {
    // Load Ballerine web component SDK
    const script = document.createElement("script")
    script.src = "https://cdn.ballerine.io/js/1.x/ballerine-sdk.js"
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

<div class="onboard-card">
  <div
    class="card-line"
    aria-hidden="true"
    style="--line-color: {meta.color}"
  ></div>

  <div in:fade={{ duration: 200 }}>
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

    <h1 class="title">Verify Your <em>Identity</em></h1>
    <p class="sub">{meta.description}</p>

    <!-- ── Documents required ────────────────────────────────────────────── -->
    <div class="docs-block">
      <div class="docs-label">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Documents you'll need
      </div>
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
</div>

<style>
  .onboard-card {
    width: 100%;
    max-width: 580px;
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
      color-mix(in srgb, var(--line-color, var(--orange)) 60%, transparent),
      transparent
    );
  }

  .intent-badge {
    display: inline-flex;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--badge-color, var(--orange));
    background: color-mix(
      in srgb,
      var(--badge-color, var(--orange)) 10%,
      transparent
    );
    border: 1px solid
      color-mix(in srgb, var(--badge-color, var(--orange)) 22%, transparent);
    padding: 2px 8px;
    border-radius: 100px;
    margin-bottom: 12px;
  }

  .retry-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(248, 113, 113, 0.07);
    border: 1px solid rgba(248, 113, 113, 0.18);
    border-radius: 10px;
    font-size: 0.78rem;
    color: #f87171;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 3vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 8px;
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
    margin-bottom: 20px;
  }

  /* ── Docs block ── */
  .docs-block {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 24px;
  }
  .docs-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 12px;
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
    color: var(--text-2);
  }
  .docs-list li svg {
    color: var(--teal);
    flex-shrink: 0;
  }

  /* ── SDK wrapper ── */
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
    color: var(--text-3);
    font-size: 0.8rem;
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
    color: var(--text-1);
  }
  .sdk-error-body {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .retry-btn {
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--orange);
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
    color: var(--teal);
    margin-bottom: 4px;
  }
  .success-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .success-body {
    font-size: 0.8rem;
    color: var(--text-3);
  }

  /* ── Error banner ── */
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
    margin-bottom: 16px;
  }

  /* ── Compliance note ── */
  .compliance-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 0.65rem;
    color: var(--text-3);
    line-height: 1.5;
    opacity: 0.7;
  }
  .compliance-note svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── Spinner ── */
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.1);
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

  @media (max-width: 520px) {
    .onboard-card {
      padding: 28px 20px;
    }
  }
</style>
