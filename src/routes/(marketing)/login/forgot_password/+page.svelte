<script lang="ts">
  import { Auth } from "@supabase/auth-ui-svelte"
  import { sharedAppearance, oauthProviders } from "../login_config"
  let { data } = $props()
</script>

<svelte:head>
  <title>Reset Password — Matatu Pulse</title>
</svelte:head>

<style>
  .forgot-wrap { width: 100%; }

  .page-header { margin-bottom: 28px; }
  .page-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display); font-size: 1.7rem;
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.15; margin-bottom: 6px;
  }
  .page-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* Info notice */
  .info-notice {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; margin-bottom: 24px;
    background: var(--surface); border: 1px solid var(--rim-2);
    border-radius: 12px;
  }
  .info-icon { color: var(--text-3); flex-shrink: 0; margin-top: 1px; }
  .info-text { font-size: 0.82rem; color: var(--text-2); line-height: 1.6; }

  /* Auth wrapper */
  .auth-wrap { margin-bottom: 20px; }

  /* Footer */
  .auth-footer { padding-top: 16px; border-top: 1px solid var(--rim); display: flex; flex-direction: column; gap: 10px; }
  .auth-footer-row { font-size: 0.82rem; color: var(--text-3); }
  .auth-footer-row a { color: var(--orange); text-decoration: none; font-weight: 600; transition: color 0.2s; }
  .auth-footer-row a:hover { color: #d95618; }
</style>

<div class="forgot-wrap">

  <div class="page-header">
    <div class="page-eyebrow">Account recovery</div>
    <h1 class="page-title">Reset Password</h1>
    <p class="page-sub">Enter the email address on your account and we'll send you a reset link.</p>
  </div>

  <div class="info-notice">
    <div class="info-icon">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <p class="info-text">
      The reset link expires after 60 minutes. Check your spam folder if the email doesn't arrive within a few minutes.
    </p>
  </div>

  <div class="auth-wrap">
    <Auth
      supabaseClient={data.supabase}
      view="forgotten_password"
      redirectTo={`${data.url}/auth/callback?next=%2Faccount%2Fsettings%2Freset_password`}
      providers={oauthProviders}
      socialLayout="horizontal"
      showLinks={false}
      appearance={sharedAppearance}
      additionalData={undefined}
    />
  </div>

  <div class="auth-footer">
    <div class="auth-footer-row">
      Remembered your password? <a href="/login/sign_in">Sign in</a>
    </div>
    <div class="auth-footer-row">
      Don't have an account? <a href="/login/sign_up">Sign up free</a>
    </div>
  </div>

</div>