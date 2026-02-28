<script lang="ts">
  import { Auth } from "@supabase/auth-ui-svelte"
  import { sharedAppearance, oauthProviders } from "../login_config"
  import posthog from "posthog-js"
  import { browser } from "$app/environment"

  let { data } = $props()
  let additionalData = undefined
  let mounted = $state(false)

  $effect(() => {
    mounted = true

    // Listen for SIGNED_UP event to capture new account creation
    const {
      data: { subscription },
    } = data.supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === "SIGNED_UP" && browser && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        })
        posthog.capture("user_signed_up", {
          email: session.user.email ?? undefined,
          provider: session.user.app_metadata?.provider ?? "email",
        })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  })
</script>

<svelte:head>
  <title>Create Account — Matatu Pulse</title>
</svelte:head>

<div class="signup-wrap">
  <div class="page-header">
    <div class="page-eyebrow">Get started</div>
    <h1 class="page-title">Create Your Account</h1>
    <p class="page-sub">
      Free for riders. Operator accounts from KES 4,500/month.
    </p>
  </div>

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

  <div class="auth-wrap">
    <Auth
      supabaseClient={data.supabase}
      view="sign_up"
      redirectTo={`${data.url}/auth/callback`}
      showLinks={false}
      providers={oauthProviders}
      socialLayout="horizontal"
      appearance={sharedAppearance}
      {additionalData}
    />
  </div>

  <div class="auth-footer">
    <div class="auth-footer-row">
      Already have an account? <a href="/login/sign_in">Sign in</a>
    </div>
  </div>

  <p class="terms-note">
    By creating an account you agree to our <a href="/terms">Terms of Service</a
    >
    and <a href="/privacy">Privacy Policy</a>.
  </p>
</div>

<style>
  .signup-wrap {
    width: 100%;
  }

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

  /* What you get strip */
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

  /* Auth wrapper */
  .auth-wrap {
    margin-bottom: 20px;
  }

  /* Footer */
  .auth-footer {
    padding-top: 16px;
    border-top: 1px solid var(--rim);
  }
  .auth-footer-row {
    font-size: 0.82rem;
    color: var(--text-3);
    margin-bottom: 10px;
  }
  .auth-footer-row:last-child {
    margin-bottom: 0;
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
