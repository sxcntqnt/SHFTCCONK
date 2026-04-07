<script lang="ts">
  import { goto } from "$app/navigation"
  import { onMount } from "svelte"
  import { resolveRouteFromBootstrap } from "$lib/features/auth/utils/resolveRoute"

  let { data } = $props()

  // ── State machine ──────────────────────────────────────────────
  type Step = "phone" | "otp" | "error"
  let step = $state<Step>("phone")

  let phone = $state("")
  let otp = $state("")
  let loading = $state(false)
  let error = $state<string | null>(null)
  let countdown = $state(0)
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  // Format phone: strip non-digits, prefix +254 for Kenya
  function normalisePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "")
    if (digits.startsWith("0") && digits.length === 10) {
      return "+254" + digits.slice(1)
    }
    if (digits.startsWith("254") && digits.length === 12) {
      return "+" + digits
    }
    if (digits.startsWith("7") && digits.length === 9) {
      return "+254" + digits
    }
    return "+" + digits
  }

  // ── Step 1: request OTP ────────────────────────────────────────
  async function requestOtp() {
    error = null
    if (!phone.trim()) {
      error = "Please enter your phone number."
      return
    }
    loading = true
    try {
      const normalised = normalisePhone(phone)
      const { error: supaErr } = await data.supabase.auth.signInWithOtp({
        phone: normalised,
      })
      if (supaErr) throw supaErr
      step = "otp"
      startCountdown()
    } catch (e: any) {
      error = e.message ?? "Could not send OTP. Please try again."
    } finally {
      loading = false
    }
  }

  // ── Step 2: verify OTP ─────────────────────────────────────────
  async function verifyOtp() {
    error = null
    if (otp.trim().length < 6) {
      error = "Please enter the 6-digit code."
      return
    }
    loading = true
    try {
      const normalised = normalisePhone(phone)
      const { error: supaErr } = await data.supabase.auth.verifyOtp({
        phone: normalised,
        token: otp.trim(),
        type: "sms",
      })
      if (supaErr) throw supaErr

      // Let bootstrap_session resolve DRIVER/CONDUCTOR role & sacco context
      const { data: rpcData, error: rpcErr } =
        await data.supabase.rpc("bootstrap_session")
      if (rpcErr) {
        console.error("bootstrap_session", rpcErr)
        goto("/app/dashboard")
        return
      }
      const payload = Array.isArray(rpcData) ? rpcData[0] : rpcData
      goto(resolveRouteFromBootstrap(payload))
    } catch (e: any) {
      error = e.message ?? "Invalid code. Please check and try again."
    } finally {
      loading = false
    }
  }

  // ── Resend countdown ───────────────────────────────────────────
  function startCountdown() {
    countdown = 60
    countdownTimer = setInterval(() => {
      countdown--
      if (countdown <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  }

  async function resendOtp() {
    if (countdown > 0) return
    otp = ""
    await requestOtp()
  }

  // OTP input: auto-submit at 6 digits
  function handleOtpInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
      .replace(/\D/g, "")
      .slice(0, 6)
    otp = val
    if (val.length === 6) verifyOtp()
  }

  onMount(() => () => {
    if (countdownTimer) clearInterval(countdownTimer)
  })
</script>

<svelte:head>
  <title>Driver Sign In — Matatu Pulse</title>
</svelte:head>

<div class="driver-wrap">
  <div class="page-header">
    <div class="page-eyebrow">Operational Access</div>
    <h1 class="page-title">
      {step === "otp" ? "Enter Your Code" : "Driver & Conductor Sign In"}
    </h1>
    <p class="page-sub">
      {step === "otp"
        ? `We sent a 6-digit code to ${phone}. Enter it below.`
        : "Sign in with your Safaricom or Airtel number. No password required."}
    </p>
  </div>

  <div class="role-badges">
    <span class="role-badge">Driver</span>
    <span class="role-badge">Conductor</span>
  </div>

  {#if error}
    <div class="error-box">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" /><line
          x1="12"
          y1="8"
          x2="12"
          y2="12"
        /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{error}</p>
    </div>
  {/if}

  <!-- ── STEP 1: Phone entry ── -->
  {#if step === "phone"}
    <div>
      <label for="phone-input">Phone Number</label>
      <div class="phone-prefix-row">
        <div class="prefix-badge">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.41-1.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
            />
          </svg>
          KE +254
        </div>
        <input
          id="phone-input"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="07XX XXX XXX"
          bind:value={phone}
          onkeydown={(e) => e.key === "Enter" && requestOtp()}
          style="flex:1;"
        />
      </div>
      <p class="input-hint">
        Enter your Safaricom, Airtel, or Telkom number. We'll send you a
        one-time code.
      </p>

      <button class="btn-submit" onclick={requestOtp} disabled={loading}>
        {#if loading}<div class="spinner"></div>{:else}
          Send Code
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          >
        {/if}
      </button>
    </div>

    <!-- ── STEP 2: OTP entry ── -->
  {:else if step === "otp"}
    <div class="info-box">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.41-1.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        />
      </svg>
      <p>
        Code sent to <strong>{phone}</strong>.
        <button
          style="background:none;border:none;color:var(--orange);font-size:inherit;font-weight:600;cursor:pointer;padding:0;"
          onclick={() => {
            step = "phone"
            error = null
          }}>Change number</button
        >
      </p>
    </div>

    <label for="otp-input">6-Digit Code</label>
    <div class="otp-input-wrap">
      <div class="otp-display">
        {#each Array(6) as _, i}
          <div class="otp-box {otp.length > i ? 'filled' : ''}">
            {otp[i] ?? ""}
          </div>
        {/each}
      </div>
      <input
        id="otp-input"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        value={otp}
        oninput={handleOtpInput}
        style="position:absolute;inset:0;opacity:0;height:100%;cursor:text;"
      />
    </div>
    <p class="input-hint">
      The code expires in 10 minutes. Auto-submits when all 6 digits are
      entered.
    </p>

    <button
      class="btn-submit"
      onclick={verifyOtp}
      disabled={loading || otp.length < 6}
    >
      {#if loading}<div class="spinner"></div>{:else}
        Verify & Sign In
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      {/if}
    </button>

    <div class="resend-row">
      {#if countdown > 0}
        <span class="resend-countdown">Resend code in {countdown}s</span>
      {:else}
        <button class="resend-btn" onclick={resendOtp}>Resend code</button>
      {/if}
    </div>
  {/if}

  <!-- Footer -->
  <div class="auth-footer" style="margin-top: 24px;">
    <div class="auth-footer-row">
      Not a driver? <a href="/login">Back to all sign-in options</a>
    </div>
    <div class="auth-footer-row">
      Need help? <a href="tel:+254700000000">Call our ops team</a>
    </div>
  </div>
</div>

<style>
  .driver-wrap {
    width: 100%;
  }

  /* Header */
  .page-header {
    margin-bottom: 28px;
  }
  .page-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 6px;
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* Role badge */
  .role-badges {
    display: flex;
    gap: 6px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .role-badge {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.22);
    color: var(--orange);
  }

  /* Phone step */
  .phone-prefix-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .prefix-badge {
    display: flex;
    align-items: center;
    padding: 11px 14px;
    background: var(--ink-2);
    border: 1px solid var(--rim-2);
    border-radius: 10px;
    font-size: 0.875rem;
    color: var(--text-2);
    font-weight: 600;
    flex-shrink: 0;
    gap: 6px;
  }

  label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: 0.03em;
    margin-bottom: 6px;
  }
  input {
    width: 100%;
    padding: 11px 14px;
    background: var(--ink-2);
    border: 1px solid var(--rim-2);
    border-radius: 10px;
    font-size: 16px;
    color: var(--text-1);
    font-family: var(--font-body);
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  input:focus {
    border-color: rgba(242, 101, 34, 0.5);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }
  input::placeholder {
    color: var(--text-3);
  }
  input.otp-input {
    text-align: center;
    letter-spacing: 0.35em;
    font-size: 1.4rem;
    font-family: var(--font-display);
    font-weight: 800;
    padding: 14px;
  }
  .input-hint {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 5px;
  }

  /* Submit button */
  .btn-submit {
    width: 100%;
    margin-top: 16px;
    padding: 13px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.28);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn-submit:hover:not(:disabled) {
    background: #d95618;
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(242, 101, 34, 0.42);
  }
  .btn-submit:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  /* OTP boxes visual */
  .otp-display {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-bottom: 4px;
    pointer-events: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
  }
  .otp-box {
    width: 36px;
    height: 44px;
    border: 1.5px solid var(--rim-2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-1);
    transition: border-color 0.2s;
  }
  .otp-box.filled {
    border-color: var(--orange);
    background: rgba(242, 101, 34, 0.06);
  }
  .otp-input-wrap {
    position: relative;
    height: 56px;
    margin-bottom: 12px;
  }
  .otp-input-wrap input {
    position: absolute;
    inset: 0;
    opacity: 0;
    height: 100%;
    cursor: text;
  }

  /* Error */
  .error-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.25);
    border-radius: 10px;
  }
  .error-box svg {
    color: #f87171;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .error-box p {
    font-size: 0.82rem;
    color: #f87171;
    line-height: 1.5;
  }

  /* Info box */
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 18px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    border-radius: 10px;
  }
  .info-box svg {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .info-box p {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.55;
  }
  .info-box strong {
    color: var(--text-1);
  }

  /* Resend row */
  .resend-row {
    text-align: center;
    margin-top: 14px;
  }
  .resend-btn {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--orange);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;
  }
  .resend-btn:disabled {
    color: var(--text-3);
    cursor: default;
  }
  .resend-countdown {
    font-size: 0.78rem;
    color: var(--text-3);
  }

  /* Footer links */
  .auth-footer {
    padding-top: 16px;
    border-top: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .auth-footer-row {
    font-size: 0.82rem;
    color: var(--text-3);
  }
  .auth-footer-row a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }
  .auth-footer-row a:hover {
    color: #d95618;
  }

  /* Spinner */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
</style>
