<!-- src/routes/(auth)/onboarding/[intent]/+page.svelte -->
<!--
  KYC page — serves all intents. Capture UI is the self-hosted, open-source
  @ballerine/web-sdk (npm, bundled — no cdn.ballerine.io script tag, no
  Ballerine cloud handshake, no case/token concept). It runs entirely
  client-side to capture ID document photo(s), the applicant's declared ID
  details, and a selfie/liveness check, then hands everything back via the
  'finish' event as a context object.

  We take that context, build a FormData (Files + fields, matching
  submitKycSchema in +page.server.ts), and POST it to ?/submitKyc, which
  uploads to storage and forwards URLs + metadata to gatebill.

  TIER (from load(), not Ballerine's kyc_full_ntsa naming — gatebill only
  knows kyc_light / kyc_full; see TIER_MAP in +page.server.ts):
    passenger            → kyc_light — ID + selfie
    crew/operator/owner/org → kyc_full — ID (+ back) + selfie + liveness check

  ASSUMPTION — the exact shape of the 'finish' event payload isn't fully
  documented for @ballerine/web-sdk; the extraction below is based on the
  closest documented shape (Ballerine's workflow context: entity.data.*
  for fields, documents[] for captured files). Console.log the raw event
  once wired up and adjust extractFromFinishContext() if the real shape
  differs.
-->
<script lang="ts">
  import { onMount } from "svelte"
  import { fade, fly } from "svelte/transition"

  let { data, form } = $props<{
    data: {
      intent: string
      tier: "kyc_light" | "kyc_full"
      isPassenger: boolean
      isProWorkflow: boolean
      isRetry?: boolean
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

  const FLOW_NAME = "kyc-flow"
  const MOUNT_ID = "ballerine-mount"

  // ── SDK state ──────────────────────────────────────────────────────────
  let sdkReady = $state(false)
  let sdkError = $state<string | null>(null)
  let submitting = $state(false)
  let submitError = $state<string | null>(null)
  let alreadySubmitted = false // guard against duplicate 'finish' firing

  // kyc_light: ID + selfie only. kyc_full: adds document back + a
  // liveness-style selfie confirmation step. Adjust step names/ids against
  // whatever your installed @ballerine/web-sdk version actually ships —
  // these match the documented example flow.
  function buildFlowConfig() {
    const steps: Record<string, unknown>[] = [
      { name: "welcome", id: "welcome" },
      {
        name: "document-selection",
        id: "document-selection",
        documentOptions: ["id_card", "passport"],
      },
      { name: "document-photo", id: "document-photo" },
      { name: "check-document", id: "check-document" },
    ]

    if (data.tier === "kyc_full") {
      steps.push({
        name: "document-photo-back-start",
        id: "document-photo-back-start",
      })
    }

    steps.push(
      { name: "selfie", id: "selfie" },
      { name: "check-selfie", id: "check-selfie" },
      { name: "loading", id: "loading" },
      { name: "final", id: "final" },
    )

    return {
      uiConfig: {
        flows: {
          [FLOW_NAME]: { steps },
        },
      },
    }
  }

  // TODO(verify): the finish event's real payload shape isn't confirmed —
  // this assumes a Ballerine-style context object (entity.data.* for
  // fields, documents[] for files with a `type`/`kind` discriminator).
  // console.log(context) on first real run and adjust the lookups below
  // to match whatever actually comes back.
  function extractFromFinishContext(context: any) {
    const data_ = context?.entity?.data ?? context?.data ?? {}
    const documents: any[] = context?.documents ?? []

    const findDoc = (kind: string) =>
      documents.find((d) => d?.type === kind || d?.kind === kind)

    const idDoc = findDoc("id_card") ?? findDoc("passport") ?? documents[0]
    const selfieDoc = findDoc("selfie") ?? findDoc("face")

    const toFile = (doc: any): File | null => {
      if (!doc) return null
      if (doc.file instanceof File) return doc.file
      if (doc.blob instanceof Blob) {
        return new File([doc.blob], `${doc.type ?? "document"}.jpg`, {
          type: doc.blob.type || "image/jpeg",
        })
      }
      return null
    }

    return {
      firstName: data_.firstName ?? data_.additionalInfo?.firstName ?? "",
      lastName: data_.lastName ?? data_.additionalInfo?.lastName ?? "",
      idNumber: data_.idNumber ?? data_.documentNumber ?? "",
      idType: idDoc?.type ?? idDoc?.kind ?? "id_card",
      countryCode: data_.country ?? data_.countryCode ?? "",
      idImage: toFile(idDoc),
      selfie: toFile(selfieDoc),
    }
  }

  async function handleFinish(context: any) {
    if (alreadySubmitted) return
    alreadySubmitted = true
    submitting = true
    submitError = null

    const fields = extractFromFinishContext(context)

    if (!fields.idImage || !fields.selfie) {
      submitting = false
      alreadySubmitted = false
      submitError =
        "Couldn't read the captured photos. Please retake and try again."
      return
    }

    const body = new FormData()
    body.set("firstName", fields.firstName)
    body.set("lastName", fields.lastName)
    body.set("idNumber", fields.idNumber)
    body.set("idType", fields.idType)
    body.set("countryCode", fields.countryCode)
    body.set("idImage", fields.idImage)
    body.set("selfie", fields.selfie)

    try {
      const res = await fetch("?/submitKyc", { method: "POST", body })
      submitting = false

      if (res.ok) {
        window.location.href = `/onboarding/${data.intent}/pending`
      } else {
        alreadySubmitted = false
        submitError = "Failed to submit verification. Try again."
      }
    } catch {
      submitting = false
      alreadySubmitted = false
      submitError = "Verification submission failed. Try again."
    }
  }

  onMount(() => {
    let mounted = true

    import("@ballerine/web-ui-sdk")
      .then(async ({ flows }) => {
        if (!mounted) return
        await flows.init(buildFlowConfig())
        if (!mounted) return

        flows.on("finish", (context: any) => {
          handleFinish(context)
        })
        flows.on("error", (err: any) => {
          sdkError =
            err?.message ?? "Verification encountered an error. Please try again."
        })

        flows.mount(FLOW_NAME, MOUNT_ID)
        sdkReady = true
      })
      .catch((err) => {
        console.error("[onboarding/[intent]] Failed to load @ballerine/web-sdk:", err)
        sdkError = "Failed to load verification service."
      })

    return () => {
      mounted = false
    }
  })
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

  <!-- ── KYC capture (self-hosted @ballerine/web-sdk, mounted in onMount) ─ -->
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
    {:else if submitting}
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
    {:else}
      <!-- @ballerine/web-sdk mounts its flow UI into this element by id.
           Kept visible (not display:none) even while !sdkReady so the SDK
           has a real, laid-out element to mount into once it loads. -->
      {#if !sdkReady}
        <div class="sdk-loading" in:fade={{ duration: 150 }}>
          <span class="spinner" aria-hidden="true"></span>
          <span>Loading verification…</span>
        </div>
      {/if}
      <div id="ballerine-mount" style="width: 100%; min-height: 480px;"></div>
    {/if}
  </div>

  {#if submitError}
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
      {submitError}
    </div>
  {/if}

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
