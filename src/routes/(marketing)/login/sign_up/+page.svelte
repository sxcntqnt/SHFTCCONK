<script lang="ts">
  /**
   * src/routes/(marketing)/login/sign_up/+page.svelte
   *
   * Registration page — custom form + GitHub OAuth.
   *
   * EMAIL REGISTRATION:
   *   POSTs to the +page.server.ts default action (Go auth service).
   *   No Supabase Auth UI involved.  Server action registers + auto-logs
   *   in + sets cookies + redirects in one round trip.
   *
   * GITHUB OAUTH:
   *   Still flows through Supabase for social auth.  The onAuthStateChange
   *   SIGNED_UP listener fires after the OAuth callback.
   *
   * FIELDS:
   *   Matching the Go /auth/register contract:
   *     email, password, first_name, last_name, country
   *   Nickname is derived server-side — not shown to the user.
   *   Country defaults to KE (Kenya) — most users are in Nairobi.
   */

  import { enhance } from "$app/forms"
  import { page } from "$app/state"
  import { browser } from "$app/environment"
  import posthog from "posthog-js"
  import { oauthProviders } from "../login_config"

  // ── Props ────────────────────────────────────────────────────────
  let { data } = $props<{ data: { supabase: any; url: string; csrfToken?: string } }>()

  // ── Form state ───────────────────────────────────────────────────
  let submitting  = $state(false)
  let mounted     = $state(false)

  // Server action result
  let actionError   = $derived(page.form?.error    as string | undefined)
  let actionEmail   = $derived(page.form?.email    as string | undefined)
  let actionFirst   = $derived(page.form?.firstName as string | undefined)
  let actionLast    = $derived(page.form?.lastName  as string | undefined)
  let actionCountry = $derived(page.form?.country  as string | undefined)

  // ── GitHub OAuth ─────────────────────────────────────────────────
  $effect(() => {
    mounted = true

    const {
      data: { subscription },
    } = data.supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === "SIGNED_UP" && browser && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        })
        posthog.capture("user_signed_up", {
          email:    session.user.email ?? undefined,
          provider: session.user.app_metadata?.provider ?? "github",
        })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  })

  async function signUpWithOAuth(provider: string) {
    await data.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${data.url}/auth/callback` },
    })
  }

  const COUNTRIES = [
    { code: "KE",    label: "Kenya" },
    { code: "UG",    label: "Uganda" },
    { code: "TZ",    label: "Tanzania" },
    { code: "RW",    label: "Rwanda" },
    { code: "ET",    label: "Ethiopia" },
    { code: "NG",    label: "Nigeria" },
    { code: "GH",    label: "Ghana" },
    { code: "ZA",    label: "South Africa" },
    { code: "Other", label: "Other" },
  ]
</script>

<svelte:head>
  <title>Create Account — Matatu Pulse</title>
</svelte:head>

<div class="signup-wrap">
  <!-- ── Header ── -->
  <div class="page-header">
    <div class="page-eyebrow">Get started</div>
    <h1 class="page-title">Create Your Account</h1>
    <p class="page-sub">
      Free for riders. Operator accounts from KES 4,500/month.
    </p>
  </div>

  <!-- ── Benefits ── -->
  <div class="benefits">
    {#each ["Live matatu tracking across Nairobi", "2-minute arrival alerts to your phone", "Route comparison and fare estimates"] as b}
      <div class="benefit">
        <span class="benefit-check">
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        {b}
      </div>
    {/each}
  </div>

  <!-- ── OAuth providers ── -->
  {#if oauthProviders.length > 0}
    <div class="oauth-section">
      {#each oauthProviders as provider}
        <button
          type="button"
          class="oauth-btn"
          onclick={() => signUpWithOAuth(provider)}
          disabled={submitting}
        >
          {#if provider === "github"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
            Continue with GitHub
          {:else}
            Continue with {provider}
          {/if}
        </button>
      {/each}
    </div>

    <div class="divider">
      <div class="divider-line"></div>
      <span class="divider-text">or sign up with email</span>
      <div class="divider-line"></div>
    </div>
  {/if}

  <!-- ── Registration form ── -->
  <form
    method="POST"
    class="auth-form"
    use:enhance={() => {
      submitting = true
      return async ({ result, update }) => {
        submitting = false
        await update()
      }
    }}
  >
    <!-- CSRF token — required by csrfHandle for all POST requests -->
    <input type="hidden" name="csrf-token" value={data.csrfToken} />

    <!-- Server-side error banner -->
    {#if actionError}
      <div class="form-error" role="alert">{actionError}</div>
    {/if}

    <!-- Name row -->
    <div class="field-row">
      <div class="field">
        <label for="first_name" class="field-label">First name</label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          class="field-input"
          autocomplete="given-name"
          placeholder="Kijana"
          value={actionFirst ?? ""}
          required
          disabled={submitting}
        />
      </div>
      <div class="field">
        <label for="last_name" class="field-label">Last name</label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          class="field-input"
          autocomplete="family-name"
          placeholder="Barubaru"
          value={actionLast ?? ""}
          required
          disabled={submitting}
        />
      </div>
    </div>

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
        autocomplete="new-password"
        placeholder="Min. 8 characters"
        minlength="8"
        required
        disabled={submitting}
      />
    </div>

    <div class="field">
      <label for="country" class="field-label">Country</label>
      <select
        id="country"
        name="country"
        class="field-input field-select"
        value={actionCountry ?? "KE"}
        disabled={submitting}
      >
        {#each COUNTRIES as c}
          <option value={c.code}>{c.label}</option>
        {/each}
      </select>
    </div>

    <button type="submit" class="submit-btn" disabled={submitting}>
      {#if submitting}
        <span class="btn-spinner" aria-hidden="true"></span>
        Creating account…
      {:else}
        Create Account
      {/if}
    </button>
  </form>

  <!-- ── Footer ── -->
  <div class="auth-footer">
    <div class="auth-footer-row">
      Already have an account? <a href="/login/sign_in">Sign in</a>
    </div>
  </div>

  <p class="terms-note">
    By creating an account you agree to our
    <a href="/terms">Terms of Service</a> and
    <a href="/privacy">Privacy Policy</a>.
  </p>
</div>

<style>
  .signup-wrap {
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
    font-size: 1.7rem;
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

  /* ── Benefits ── */
  .benefits {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
    padding: 16px 18px;
    background: rgba(242, 101, 34, 0.04);
    border: 1px solid rgba(242, 101, 34, 0.15);
    border-radius: 12px;
  }
  .benefit {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .benefit-check {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(0, 176, 155, 0.15);
    border: 1px solid rgba(0, 176, 155, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
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

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 360px) {
    .field-row {
      grid-template-columns: 1fr;
    }
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
    font-size: 16px;
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

  /* Select — remove native arrow, replace with custom */
  .field-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a5a72' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }
  .field-select option {
    background: #13131a;
    color: #e8e8f0;
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
    padding-top: 16px;
    margin-top: 20px;
    border-top: 1px solid var(--rim);
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

  .terms-note {
    font-size: 0.72rem;
    color: var(--text-3);
    line-height: 1.55;
    margin-top: 14px;
  }
  .terms-note a {
    color: var(--text-3);
    text-decoration: underline;
    transition: color 0.2s;
  }
  .terms-note a:hover {
    color: var(--orange);
  }
</style>
