<script lang="ts">
  /**
   * /verify/+page.svelte
   *
   * Three states:
   *   sms_form    — user needs to enter 6-digit OTP from SMS
   *   email_error — email link was invalid/expired/used
   *   (success)   — handled by redirect in load(), never rendered
   */
  import { enhance } from "$app/forms"

  type Data = {
    mode: "sms_form" | "email_error"
    error: string | null
  }

  let { data, form }: { data: Data; form: { error?: string } | null } = $props()

  let otp = $state("")

  // Auto-focus and format OTP input
  function onOtpInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
      .replace(/\D/g, "")
      .slice(0, 6)
    otp = val
    ;(e.target as HTMLInputElement).value = val
  }
</script>

<svelte:head>
  <title>Verify your identity — sxcntqnt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="vf-root">
  <div class="vf-bg"></div>

  <div class="vf-card">
    <!-- Logo / brand mark -->
    <div class="vf-brand">
      <div class="vf-logo">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <span class="vf-brand-name">sxcntqnt</span>
    </div>

    {#if data.mode === "email_error"}
      <!-- Email link error state -->
      <div class="vf-error-state">
        <div class="vf-error-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 class="vf-title">Link invalid</h1>
        <p class="vf-subtitle">{data.error}</p>
        <p class="vf-help">
          Contact your SACCO administrator to resend the verification.
        </p>
      </div>
    {:else}
      <!-- SMS OTP entry form -->
      <h1 class="vf-title">Enter your code</h1>
      <p class="vf-subtitle">
        Enter the 6-digit code sent to your phone by your SACCO administrator.
      </p>

      {#if form?.error}
        <div class="vf-form-error">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {form.error}
        </div>
      {/if}

      <form method="post" action="?/verify" use:enhance class="vf-form">
        <div class="vf-otp-group">
          <label class="vf-label" for="otp_input">Verification Code</label>
          <input
            id="otp_input"
            name="otp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="000000"
            class="vf-otp-input"
            class:vf-otp-complete={otp.length === 6}
            bind:value={otp}
            oninput={onOtpInput}
            autofocus
          />
          <p class="vf-otp-hint">
            {#if otp.length > 0 && otp.length < 6}
              {6 - otp.length} digits remaining
            {:else if otp.length === 6}
              ✓ Ready to submit
            {:else}
              Enter the code exactly as received
            {/if}
          </p>
        </div>

        <button type="submit" class="vf-btn-submit" disabled={otp.length !== 6}>
          Verify Identity
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </form>

      <p class="vf-footer">
        Code expired or not received?<br />
        Contact your SACCO admin to resend.
      </p>
    {/if}
  </div>
</div>

<style>
  .vf-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0c0e13;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
  }
  .vf-bg {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(
        ellipse at 30% 20%,
        rgba(96, 165, 250, 0.06) 0%,
        transparent 60%
      ),
      radial-gradient(
        ellipse at 70% 80%,
        rgba(251, 191, 36, 0.04) 0%,
        transparent 60%
      );
    pointer-events: none;
  }

  .vf-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    backdrop-filter: blur(16px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  }

  /* Brand */
  .vf-brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 2rem;
  }
  .vf-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.15),
      rgba(96, 165, 250, 0.05)
    );
    border: 1px solid rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }
  .vf-brand-name {
    font-size: 1rem;
    font-weight: 700;
    color: #f0f1f4;
    letter-spacing: -0.01em;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* Titles */
  .vf-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0 0 0.5rem;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .vf-subtitle {
    font-size: 0.88rem;
    color: #6b7084;
    margin: 0 0 1.75rem;
    line-height: 1.55;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* Error state */
  .vf-error-state {
    text-align: center;
  }
  .vf-error-icon {
    color: #f87171;
    margin-bottom: 1rem;
  }
  .vf-help {
    font-size: 0.82rem;
    color: #555a6e;
    margin-top: 0.75rem;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* Form error */
  .vf-form-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.9rem;
    margin-bottom: 1.25rem;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 9px;
    font-size: 0.82rem;
    color: #f87171;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* OTP input */
  .vf-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .vf-otp-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .vf-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555a6e;
    font-weight: 600;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .vf-otp-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    font-size: 2rem;
    font-weight: 500;
    color: #f0f1f4;
    font-family: "JetBrains Mono", monospace;
    letter-spacing: 0.25em;
    text-align: center;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    box-sizing: border-box;
  }
  .vf-otp-input::placeholder {
    color: #2e3040;
    letter-spacing: 0.25em;
  }
  .vf-otp-input:focus {
    border-color: rgba(96, 165, 250, 0.5);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }
  .vf-otp-complete {
    border-color: rgba(74, 222, 128, 0.4);
    box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.08);
  }
  .vf-otp-hint {
    font-size: 0.75rem;
    color: #555a6e;
    margin: 0;
    text-align: center;
    font-family: "DM Sans", system-ui, sans-serif;
    min-height: 1.2em;
  }

  /* Submit */
  .vf-btn-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    width: 100%;
    padding: 0.85rem;
    font-size: 0.92rem;
    font-weight: 700;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.12s,
      opacity 0.15s;
    letter-spacing: 0.01em;
  }
  .vf-btn-submit:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .vf-btn-submit:active:not(:disabled) {
    transform: translateY(0);
  }
  .vf-btn-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Footer */
  .vf-footer {
    font-size: 0.78rem;
    color: #44475a;
    text-align: center;
    margin: 1rem 0 0;
    line-height: 1.6;
    font-family: "DM Sans", system-ui, sans-serif;
  }

  @media (max-width: 480px) {
    .vf-card {
      padding: 2rem 1.25rem;
      border-radius: 16px;
    }
    .vf-otp-input {
      font-size: 1.6rem;
      padding: 0.85rem;
    }
  }
</style>
