<!-- src/routes/(auth)/onboarding/[intent]/+page.svelte -->
<!--
  KYC page — serves all intents. Capture UI is our own in-house wizard
  (Details → ID Document [→ ID Back] → Selfie → Review) — no external
  capture SDK, nothing loaded client-side beyond this component.

  We build a FormData (Files + fields, matching submitKycSchema in
  +page.server.ts) from the wizard's local state and POST it to
  ?/submitKyc, same contract the old Ballerine integration used.

  TIER (from load()):
    passenger              → kyc_light — ID front + selfie
    crew/operator/owner/org → kyc_full  — ID front + back + selfie

  NOTE: meta.docs below lists every document NTSA actually requires per
  intent (licence, cert of good conduct, logbook, etc.), but
  submitKycSchema currently only accepts idImage + selfie regardless of
  intent — same scope the Ballerine version shipped with. The extra docs
  are shown to set expectations but aren't collected yet; wire up
  additional upload steps + schema fields when the backend is ready.
-->
<script lang="ts">
  import { onMount } from "svelte"
  import { fade, fly } from "svelte/transition"
  import { page } from "$app/state"

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

  const csrfToken = $derived(page.data.csrfToken)

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

  // ── Wizard steps (varies with tier) ───────────────────────────────────────
  type StepId = "applicant" | "id-front" | "id-back" | "selfie" | "review"

  const steps: { id: StepId; label: string }[] = [
    { id: "applicant", label: "Details" },
    { id: "id-front", label: "ID Document" },
    ...(data.tier === "kyc_full" ? [{ id: "id-back" as StepId, label: "ID Back" }] : []),
    { id: "selfie", label: "Selfie" },
    { id: "review", label: "Review" },
  ]

  let stepIndex = $state(0)
  let currentStepId = $derived(steps[stepIndex]?.id)

  // ── Applicant fields ───────────────────────────────────────────────────────
  let firstName = $state("")
  let lastName = $state("")
  let idNumber = $state("")
  let idType = $state<"id_card" | "passport">("id_card")
  let countryCode = $state("KE")

  let isApplicantValid = $derived(
    firstName.trim().length > 1 && lastName.trim().length > 1 && idNumber.trim().length > 3,
  )

  // ── Document capture ────────────────────────────────────────────────────────
  let idImageFront = $state<File | null>(null)
  let idImageFrontPreview = $state<string | null>(null)
  let idImageBack = $state<File | null>(null)
  let idImageBackPreview = $state<string | null>(null)
  let dragSide = $state<"front" | "back" | null>(null)

  function setIdFile(side: "front" | "back", file: File | undefined | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (side === "front") {
      if (idImageFrontPreview) URL.revokeObjectURL(idImageFrontPreview)
      idImageFront = file
      idImageFrontPreview = url
    } else {
      if (idImageBackPreview) URL.revokeObjectURL(idImageBackPreview)
      idImageBack = file
      idImageBackPreview = url
    }
  }

  function onFileInput(e: Event, side: "front" | "back") {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    setIdFile(side, file)
  }

  function onDrop(e: DragEvent, side: "front" | "back") {
    e.preventDefault()
    dragSide = null
    setIdFile(side, e.dataTransfer?.files?.[0])
  }

  // ── Selfie capture ──────────────────────────────────────────────────────────
  let videoEl: HTMLVideoElement
  let canvasEl: HTMLCanvasElement
  let mediaStream: MediaStream | null = null
  let cameraActive = $state(false)
  let cameraError = $state<string | null>(null)
  let selfieFile = $state<File | null>(null)
  let selfiePreview = $state<string | null>(null)

  async function startCamera() {
    cameraError = null
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      if (videoEl) videoEl.srcObject = mediaStream
      cameraActive = true
    } catch {
      cameraError = "Camera access is off. Enable it in your browser settings to continue."
    }
  }

  function stopCamera() {
    mediaStream?.getTracks().forEach((t) => t.stop())
    mediaStream = null
    cameraActive = false
  }

  function captureSelfie() {
    if (!videoEl || !canvasEl) return
    canvasEl.width = videoEl.videoWidth
    canvasEl.height = videoEl.videoHeight
    const ctx = canvasEl.getContext("2d")!
    ctx.translate(canvasEl.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoEl, 0, 0)
    canvasEl.toBlob(
      (blob) => {
        if (!blob) return
        if (selfiePreview) URL.revokeObjectURL(selfiePreview)
        selfieFile = new File([blob], "selfie.jpg", { type: "image/jpeg" })
        selfiePreview = URL.createObjectURL(blob)
      },
      "image/jpeg",
      0.92,
    )
    stopCamera()
  }

  function retakeSelfie() {
    selfieFile = null
    if (selfiePreview) URL.revokeObjectURL(selfiePreview)
    selfiePreview = null
    startCamera()
  }

  // Camera follows the active step — starts on arrival, stops on departure.
  $effect(() => {
    if (currentStepId === "selfie" && !selfieFile && !cameraActive && !cameraError) {
      startCamera()
    }
    if (currentStepId !== "selfie" && cameraActive) {
      stopCamera()
    }
  })

  onMount(() => () => stopCamera())

  // ── Navigation ───────────────────────────────────────────────────────────
  function canProceed() {
    if (currentStepId === "applicant") return isApplicantValid
    if (currentStepId === "id-front") return !!idImageFront
    if (currentStepId === "id-back") return !!idImageBack
    if (currentStepId === "selfie") return !!selfieFile
    return true
  }

  function goTo(i: number) {
    if (i < stepIndex) stepIndex = i
  }
  function next() {
    if (canProceed() && stepIndex < steps.length - 1) stepIndex++
  }
  function prev() {
    if (stepIndex > 0) stepIndex--
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  let submitting = $state(false)
  let submitError = $state<string | null>(null)

  async function submitVerification() {
    submitting = true
    submitError = null

    const body = new FormData()
    body.set("csrf-token", csrfToken)
    body.set("firstName", firstName.trim())
    body.set("lastName", lastName.trim())
    body.set("idNumber", idNumber.trim())
    body.set("idType", idType)
    body.set("countryCode", countryCode)
    if (idImageFront) body.set("idImage", idImageFront)
    if (selfieFile) body.set("selfie", selfieFile)
    // ASSUMPTION: submitKycSchema doesn't declare a back-of-ID field yet.
    // Sent only when present so kyc_light (front-only) submissions are
    // unaffected — confirm the field name server-side before relying on it.
    if (idImageBack) body.set("idImageBack", idImageBack)

    try {
      const res = await fetch("?/submitKyc", { method: "POST", body })
      if (res.ok) {
        window.location.href = `/onboarding/${data.intent}/pending`
      } else {
        submitting = false
        submitError = "Failed to submit verification. Try again."
      }
    } catch {
      submitting = false
      submitError = "Verification submission failed. Try again."
    }
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {doc}
        </li>
      {/each}
    </ul>
  </div>

  <!-- ── KYC capture wizard ─────────────────────────────────────────────── -->
  <div class="sdk-wrapper" class:is-panel={!submitting}>
    {#if submitting}
      <div class="sdk-success" in:fade={{ duration: 200 }}>
        <div class="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="success-title">Verification submitted</div>
        <div class="success-body">Submitting your application…</div>
        <span class="spinner" aria-hidden="true"></span>
      </div>
    {:else}
      <div class="wizard">
        <!-- Route-line stepper -->
        <div class="wizard-rail">
          <div class="rail-track"></div>
          <div class="rail-fill" style="width: {(stepIndex / (steps.length - 1)) * 100}%"></div>
          {#each steps as step, i}
            <button
              type="button"
              class="rail-stop"
              class:is-current={i === stepIndex}
              class:is-done={i < stepIndex}
              disabled={i > stepIndex}
              onclick={() => goTo(i)}
            >
              <span class="stop-dot">
                {#if i < stepIndex}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                {/if}
              </span>
              <span class="stop-label">{step.label}</span>
            </button>
          {/each}
        </div>

        <!-- Step content -->
        <div class="wizard-panel">
          {#key currentStepId}
            <div in:fly={{ y: 10, duration: 220 }}>
              {#if currentStepId === "applicant"}
                <div class="field-grid">
                  <label class="field">
                    <span class="field-label">First name</span>
                    <input class="field-input" type="text" bind:value={firstName} placeholder="Wanjiru" />
                  </label>
                  <label class="field">
                    <span class="field-label">Last name</span>
                    <input class="field-input" type="text" bind:value={lastName} placeholder="Kamau" />
                  </label>
                  <label class="field">
                    <span class="field-label">ID number</span>
                    <input class="field-input" type="text" bind:value={idNumber} placeholder="12345678" />
                  </label>
                  <label class="field">
                    <span class="field-label">ID type</span>
                    <select class="field-input" bind:value={idType}>
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="ALIEN_ID">Alien ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="DRIVING_LICENCE">Driving Licence</option>
                    </select>
                  </label>
                </div>
              {:else if currentStepId === "id-front" || currentStepId === "id-back"}
                {@const side = currentStepId === "id-front" ? "front" : "back"}
                {@const preview = side === "front" ? idImageFrontPreview : idImageBackPreview}
                <div
                  class="dropzone"
                  class:has-file={!!preview}
                  class:is-dragging={dragSide === side}
                  ondragover={(e) => {
                    e.preventDefault()
                    dragSide = side
                  }}
                  ondragleave={() => (dragSide = null)}
                  ondrop={(e) => onDrop(e, side)}
                >
                  {#if preview}
                    <img src={preview} alt="{side} of ID" class="dropzone-preview" />
                    <div class="dropzone-badge">
                      <span class="badge-dot"></span>
                      Uploaded
                    </div>
                  {:else}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p class="dropzone-title">{side === "front" ? "Front side" : "Back side"}</p>
                    <p class="dropzone-sub">Drop an image or <span class="link">browse</span></p>
                  {/if}
                  <input
                    class="dropzone-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onchange={(e) => onFileInput(e, side)}
                  />
                </div>
              {:else if currentStepId === "selfie"}
                <div class="selfie-frame">
                  {#if cameraError}
                    <div class="selfie-error">
                      <p>{cameraError}</p>
                      <button type="button" class="retry-btn" onclick={startCamera}>Try again</button>
                    </div>
                  {:else if selfiePreview}
                    <img src={selfiePreview} alt="Captured selfie" class="selfie-media" />
                    <div class="selfie-caption">
                      <span class="badge-dot"></span>
                      Face detected
                    </div>
                  {:else}
                    <video bind:this={videoEl} autoplay playsinline muted class="selfie-media selfie-mirror"></video>
                    <div class="selfie-guide"></div>
                    <button type="button" class="shutter" onclick={captureSelfie} aria-label="Capture selfie">
                      <span class="shutter-inner"></span>
                    </button>
                  {/if}
                </div>
                <p class="selfie-hint">Keep your face inside the circle. This photo is matched against your ID.</p>
                {#if selfiePreview}
                  <button type="button" class="retake-btn" onclick={retakeSelfie}>Retake</button>
                {/if}
              {:else if currentStepId === "review"}
                <div class="review-list">
                  <div class="review-row">
                    <span class="review-label">Applicant</span>
                    <span class="review-value">{firstName} {lastName}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">ID number</span>
                    <span class="review-value">{idNumber || "—"}</span>
                  </div>
                  <div class="review-row">
                    <span class="review-label">ID document</span>
                    <span class="review-value review-ok">Uploaded</span>
                  </div>
                  {#if data.tier === "kyc_full"}
                    <div class="review-row">
                      <span class="review-label">ID document (back)</span>
                      <span class="review-value review-ok">Uploaded</span>
                    </div>
                  {/if}
                  <div class="review-row">
                    <span class="review-label">Selfie</span>
                    <span class="review-value review-ok">Captured</span>
                  </div>
                </div>
              {/if}
            </div>
          {/key}
        </div>

        <!-- Nav -->
        <div class="wizard-nav">
          <button type="button" class="nav-back" disabled={stepIndex === 0} onclick={prev}>← Back</button>
          {#if currentStepId === "review"}
            <button type="button" class="nav-next" onclick={submitVerification}>Submit for verification</button>
          {:else}
            <button type="button" class="nav-next" disabled={!canProceed()} onclick={next}>Continue →</button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  <canvas bind:this={canvasEl} style="display: none;"></canvas>

  {#if submitError}
    <div class="error-banner" role="alert" in:fly={{ y: 6, duration: 180 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {submitError}
    </div>
  {/if}

  {#if form?.message}
    <div class="error-banner" role="alert" in:fly={{ y: 6, duration: 180 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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

  .intent-badge {
    display: inline-flex;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--badge-color, var(--orange, #f26522));
    background: color-mix(in srgb, var(--badge-color, var(--orange, #f26522)) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color, var(--orange, #f26522)) 22%, transparent);
    padding: 2px 8px;
    border-radius: 100px;
    margin-bottom: 14px;
  }

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
     WIZARD WRAPPER
  ════════════════════════════════════ */
  .sdk-wrapper {
    min-height: 200px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.02);
    margin-bottom: 20px;
    overflow: hidden;
  }
  .sdk-wrapper.is-panel {
    padding: 22px 20px 20px;
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

  /* ── Route-line stepper ── */
  .wizard-rail {
    position: relative;
    display: flex;
    justify-content: space-between;
    margin-bottom: 22px;
  }
  .rail-track,
  .rail-fill {
    position: absolute;
    top: 15px;
    left: 24px;
    right: 24px;
    height: 2px;
  }
  .rail-track {
    background: rgba(255, 255, 255, 0.08);
  }
  .rail-fill {
    right: auto;
    background: linear-gradient(90deg, var(--orange, #f26522), #ff9f5a);
    transition: width 0.4s ease;
  }
  .rail-stop {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .rail-stop:disabled {
    cursor: not-allowed;
  }
  .stop-dot {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-3, #605d70);
    transition: all 0.25s ease;
  }
  .rail-stop.is-current .stop-dot {
    border-color: var(--orange, #f26522);
    background: var(--orange, #f26522);
    box-shadow: 0 0 0 4px rgba(242, 101, 34, 0.18);
  }
  .rail-stop.is-done .stop-dot {
    border-color: rgba(0, 176, 155, 0.4);
    background: rgba(0, 176, 155, 0.1);
    color: var(--teal, #00b09b);
  }
  .stop-label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--text-3, #605d70);
  }
  .rail-stop.is-current .stop-label {
    color: var(--orange, #f26522);
  }
  .rail-stop.is-done .stop-label {
    color: var(--teal, #00b09b);
  }

  /* ── Panel content ── */
  .wizard-panel {
    min-height: 220px;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3, #605d70);
  }
  .field-input {
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.85rem;
    color: var(--text-1, #f0eee8);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    padding: 11px 13px;
    outline: none;
    transition: all 0.15s ease;
  }
  .field-input::placeholder {
    color: var(--text-3, #605d70);
  }
  .field-input:focus {
    border-color: color-mix(in srgb, var(--orange, #f26522) 55%, transparent);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }
  .field-input option {
    background: #16161f;
  }

  /* ── Dropzone ── */
  .dropzone {
    position: relative;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: var(--text-3, #605d70);
    transition: all 0.2s ease;
    min-height: 190px;
    justify-content: center;
    overflow: hidden;
  }
  .dropzone.is-dragging {
    border-color: color-mix(in srgb, var(--orange, #f26522) 55%, transparent);
    background: rgba(242, 101, 34, 0.05);
  }
  .dropzone.has-file {
    border-style: solid;
    border-color: rgba(0, 176, 155, 0.3);
    padding: 0;
  }
  .dropzone-preview {
    width: 100%;
    height: 190px;
    object-fit: cover;
    display: block;
  }
  .dropzone-badge {
    position: absolute;
    bottom: 10px;
    left: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    border-radius: 100px;
    padding: 5px 11px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--teal, #00b09b);
  }
  .dropzone-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-1, #f0eee8);
    margin-top: 10px;
  }
  .dropzone-sub {
    font-size: 0.75rem;
    margin-top: 3px;
  }
  .dropzone .link {
    color: var(--orange, #f26522);
    font-weight: 600;
  }
  .dropzone-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .dropzone.has-file .dropzone-input {
    display: none;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal, #00b09b);
  }

  /* ── Selfie ── */
  .selfie-frame {
    position: relative;
    width: 220px;
    aspect-ratio: 1;
    margin: 0 auto;
    border-radius: 20px;
    overflow: hidden;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .selfie-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .selfie-mirror {
    transform: scaleX(-1);
  }
  .selfie-guide {
    position: absolute;
    inset: 12%;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--orange, #f26522) 70%, transparent);
    box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.35);
  }
  .shutter {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .shutter:active {
    transform: translateX(-50%) scale(0.92);
  }
  .shutter-inner {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #fff;
  }
  .selfie-caption {
    position: absolute;
    bottom: 12px;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--teal, #00b09b);
    background: linear-gradient(to top, rgba(0, 0, 0, 0.75), transparent);
    padding: 26px 0 8px;
  }
  .selfie-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px;
    text-align: center;
  }
  .selfie-error p {
    font-size: 0.78rem;
    color: var(--text-3, #605d70);
    line-height: 1.5;
  }
  .selfie-hint {
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-3, #605d70);
    margin-top: 14px;
  }
  .retake-btn {
    display: block;
    margin: 12px auto 0;
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-2, #9996a8);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 7px 16px;
    cursor: pointer;
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

  /* ── Review ── */
  .review-list {
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.07);
  }
  .review-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.015);
  }
  .review-row + .review-row {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .review-label {
    font-size: 0.78rem;
    color: var(--text-2, #9996a8);
  }
  .review-value {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1, #f0eee8);
  }
  .review-ok {
    color: var(--teal, #00b09b);
  }

  /* ── Wizard nav ── */
  .wizard-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .nav-back {
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-3, #605d70);
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 10px;
  }
  .nav-back:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .nav-next {
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
    background: var(--orange, #f26522);
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    box-shadow: 0 4px 16px -4px rgba(242, 101, 34, 0.5);
    transition: all 0.15s ease;
  }
  .nav-next:hover:not(:disabled) {
    background: #ff7530;
  }
  .nav-next:disabled {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-3, #605d70);
    box-shadow: none;
    cursor: not-allowed;
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
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
