<script lang="ts">
  /**
   * src/routes/(marketing)/login/sign_in/+page.svelte
   *
   * Sign-in page — email/password form. GitHub OAuth temporarily disabled.
   *
   * EMAIL/PASSWORD:
   *   Custom form that POSTs to the +page.server.ts default action via
   *   SvelteKit progressive enhancement (use:enhance). Calls the
   *   auth-service directly — unaffected by the Supabase removal.
   *
   * GITHUB OAUTH — ⚠️ NOT YET MIGRATED, INTENTIONALLY DISABLED:
   *   The previous flow was signInWithOAuth() → /auth/callback →
   *   sessionSyncHandle mapping a Supabase user to an internal one, then
   *   a client-side bootstrap_session() RPC + setUserFromBootstrap() to
   *   decide the post-login redirect. All of that was Supabase-specific
   *   and none of it has a designed replacement: the auth-service's route
   *   table (see its README) has no OAuth endpoint — only
   *   /auth/register, /auth/login, /auth/refresh, /auth/logout(-all),
   *   /auth/sessions, /auth/context/activate, /auth/verify, /auth/me.
   *   Wiring GitHub back in needs a real design decision (does
   *   auth-service grow an OAuth callback route? does something else
   *   front it?) before this can be un-stubbed — not something to guess
   *   at here. Until then, the button is hidden.
   *
   *   bootstrap_session() is also no longer client-callable at all (see
   *   pg.ts / +layout.server.ts) — even a stopgap OAuth flow can't call
   *   it the way this file used to.
   */

  import { enhance } from "$app/forms"
  import { page } from "$app/state"

  // ── Props ────────────────────────────────────────────────────────
  let { data } = $props<{ data: { csrfToken?: string } }>()

  // ── Form state ───────────────────────────────────────────────────
  let submitting = $state(false)

  // Server action result — present after a failed submission
  let actionError = $derived(page.form?.error as string | undefined)
  let actionEmail = $derived(page.form?.email as string | undefined)

  // ── Misc derivations ─────────────────────────────────────────────
  let verified = $derived(page.url?.searchParams?.get("verified") === "true")
</script>

<svelte:head>
  <title>Sign In — Matatu Pulse</title>
</svelte:head>

<div class="signin-wrap">
  <!-- ── Header ── -->
  <div class="page-header">
    <div class="page-eyebrow">Sign In</div>
    <h1 class="page-title">Welcome Back</h1>
    <p class="page-sub">
      Enter your email and password. You'll be routed to the right dashboard
      automatically.
    </p>
  </div>

  <!-- ── Misdirection nudge ── -->
  <div class="role-context">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <p>
      Not sure you're in the right place?
      <a href="/login">See all sign-in options →</a>
    </p>
  </div>

  <!-- ── Email verified confirmation ── -->
  {#if verified}
    <div class="alert-verified" role="alert">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>Email verified — you can now sign in.</span>
    </div>
  {/if}

  <!-- OAuth section intentionally removed — see script comment above.
       Re-add once auth-service has a real OAuth route. -->

  <!-- ── Email / password form ── -->
  <form
    method="POST"
    class="auth-form"
    use:enhance={() => {
      submitting = true

      return async ({ update }) => {
        submitting = false
        await update()
      }
    }}
  >
    <!-- CSRF token — required by csrfHandle for all POST requests -->
    <input type="hidden" name="csrf-token" value={data.csrfToken} />

    {#if actionError}
      <div class="form-error" role="alert">{actionError}</div>
    {/if}

    <div class="field">
      <label for="email" class="field-label">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        class="field-input"
        autocomplete="email"
        placeholder="you@example.com"
        value={actionEmail ?? ""}
        required
        disabled={submitting}
      />
    </div>

    <div class="field">
      <label for="password" class="field-label">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        class="field-input"
        autocomplete="current-password"
        placeholder="••••••••"
        required
        disabled={submitting}
      />
    </div>

    <button type="submit" class="submit-btn" disabled={submitting}>
      {#if submitting}
        <span class="btn-spinner" aria-hidden="true"></span>
        Signing in…
      {:else}
        Sign In
      {/if}
    </button>
  </form>

  <!-- ── Footer links ── -->
  <div class="auth-footer">
    <div class="auth-footer-row">
      <a href="/login/forgot_password">Forgot your password?</a>
    </div>

    <div class="footer-divider">
      <div class="footer-divider-line"></div>
      <span class="footer-divider-text">Other sign-in methods</span>
      <div class="footer-divider-line"></div>
    </div>

    <div class="auth-footer-row">
      Driver or conductor? <a href="/login/driver">Sign in with phone OTP</a>
    </div>
    <div class="auth-footer-row">
      Government / authority? <a href="/login/sso">Use your organisation SSO</a>
    </div>

    <div class="footer-divider">
      <div class="footer-divider-line"></div>
      <span class="footer-divider-text">New here</span>
      <div class="footer-divider-line"></div>
    </div>

    <div class="auth-footer-row">
      New rider? <a href="/login/sign_up">Create a free account</a>
    </div>
    <div class="auth-footer-row">
      Sacco staff? <a href="/login/invite">Redeem your invitation code</a>
    </div>
    <div class="auth-footer-row">
      Fleet owner not yet onboarded?
      <a href="/contact_us?type=partnership">Request access</a>
    </div>
  </div>
</div>

<style>
  .signin-wrap {
    width: 100%;
  }

  /* ── Header ── */
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

  /* ── Verified alert ── */
  .alert-verified {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 15px;
    margin-bottom: 20px;
    background: rgba(0, 176, 155, 0.07);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 12px;
    animation: slide-in 0.3s ease both;
  }
  .alert-verified svg {
    color: var(--teal);
    flex-shrink: 0;
  }
  .alert-verified span {
    font-size: 0.875rem;
    color: var(--text-1);
    font-weight: 500;
  }
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Misdirection nudge ── */
  .role-context {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    margin-bottom: 22px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
  }
  .role-context svg {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .role-context p {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.6;
    margin: 0;
  }
  .role-context a {
    color: var(--orange);
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
  }
  .role-context a:hover {
    color: #d95618;
  }

  /* ── OAuth ── */
  .oauth-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }
  .oauth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 11px 16px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--font-display, inherit);
    color: var(--text-1);
    background: #1a1a20;
    border: 1px solid #2a2a38;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .oauth-btn:hover:not(:disabled) {
    background: #222230;
    border-color: #3a3a50;
  }
  .oauth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Divider ── */
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0 18px;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: #2a2a38;
  }
  .divider-text {
    font-size: 0.7rem;
    color: #5a5a72;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ── Form ── */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .form-error {
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    line-height: 1.55;
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.25);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: #9090aa;
  }
  .field-input {
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 16px; /* 16px → no iOS zoom */
    font-family: "DM Sans", system-ui, sans-serif;
    color: #e8e8f0;
    background: #13131a;
    border: 1px solid #2a2a38;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .field-input::placeholder {
    color: #5a5a72;
  }
  .field-input:hover {
    border-color: #3a3a50;
  }
  .field-input:focus {
    outline: none;
    border-color: rgba(242, 101, 34, 0.5);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }
  .field-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: none;
    font-size: 0.9rem;
    font-weight: 700;
    font-family: "Syne", system-ui, sans-serif;
    letter-spacing: 0.01em;
    color: #ffffff;
    background: #f26522;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.25);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
    margin-top: 4px;
  }
  .submit-btn:hover:not(:disabled) {
    background: #d95618;
    box-shadow: 0 8px 32px rgba(242, 101, 34, 0.4);
    transform: translateY(-1px);
  }
  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  /* Spinner */
  .btn-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Footer ── */
  .auth-footer {
    padding-top: 18px;
    margin-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .auth-footer-row {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.5;
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

  .footer-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 3px 0;
  }
  .footer-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
  .footer-divider-text {
    font-size: 0.62rem;
    color: var(--text-3);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
