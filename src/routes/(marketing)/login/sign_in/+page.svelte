<script lang="ts">
  import { Auth } from "@supabase/auth-ui-svelte"
  import { sharedAppearance, oauthProviders } from "../login_config"
  import { goto } from "$app/navigation"
  import { page } from "$app/state" // Svelte 5 — not $app/stores
  import { setUserFromBootstrap } from "$lib/features/auth/stores/auth"
  import { resolveRouteFromBootstrap } from "$lib/features/auth/utils/resolveRoute"
  import posthog from "posthog-js"
  import { browser } from "$app/environment"

  // ── Props ──────────────────────────────────────────────────────────
  let { data } = $props<{ data: { supabase: any; url: string } }>()

  // ── Mounted guard ──────────────────────────────────────────────────
  let mounted = $state(false)

  // ── Auth listener ──────────────────────────────────────────────────
  $effect(() => {
    mounted = true

    const {
      data: { subscription },
    } = data.supabase.auth.onAuthStateChange(
      async (event: string, _session: any) => {
        if (event !== "SIGNED_IN") return
        if (!mounted) return

        await new Promise<void>((r) => setTimeout(r, 200))
        if (!mounted) return

        try {
          const { data: rpcData, error } =
            await data.supabase.rpc("bootstrap_session")
          if (!mounted) return

          if (error) {
            console.error("bootstrap_session:", error)
            goto("/app/dashboard")
            return
          }

          const payload = Array.isArray(rpcData) ? rpcData[0] : rpcData
          setUserFromBootstrap(payload)

          // Identify the user in PostHog and capture sign-in event
          if (browser && payload?.profile_id) {
            posthog.identify(payload.profile_id, {
              email: payload.email ?? undefined,
              name: payload.name ?? undefined,
              role: payload.actor_type ?? undefined,
              sacco: payload.sacco ?? undefined,
            })
            posthog.capture("user_signed_in", {
              role: payload.actor_type ?? "unknown",
              sacco: payload.sacco ?? null,
            })
          }

          goto(resolveRouteFromBootstrap(payload))
        } catch (err) {
          if (!mounted) return
          console.error("bootstrap_session threw:", err)
          goto("/app/dashboard")
        }
      },
    )

    // $effect cleanup — runs on unmount, equivalent to onMount return fn
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  })

  // ── Verified email param ───────────────────────────────────────────
  let verified = $derived(page.url?.searchParams?.get("verified") === "true")
</script>

<svelte:head>
  <title>Sign In — Matatu Pulse</title>
</svelte:head>

<div class="signin-wrap">
  <!-- Header -->
  <div class="page-header">
    <div class="page-eyebrow">Sign In</div>
    <h1 class="page-title">Welcome Back</h1>
    <p class="page-sub">
      Enter your email and password. You'll be routed to the right dashboard
      automatically.
    </p>
  </div>

  <!-- Misdirection nudge — only shown to users who may have landed here by mistake -->
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

  <!-- Email verified confirmation — only shown when ?verified=true -->
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

  <!-- Supabase Auth UI -->
  <div class="auth-wrap">
    <Auth
      supabaseClient={data.supabase}
      view="sign_in"
      redirectTo={`${data.url}/auth/callback`}
      providers={oauthProviders}
      socialLayout="horizontal"
      showLinks={false}
      appearance={sharedAppearance}
      additionalData={undefined}
    />
  </div>

  <!-- Footer links -->
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
      Fleet owner not yet onboarded? <a href="/contact_us?type=partnership"
        >Request access</a
      >
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

  /* ── Email verified alert ── */
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

  /* ── Auth component wrapper ── */
  .auth-wrap {
    margin-bottom: 6px;
  }

  /* ── Footer ── */
  .auth-footer {
    padding-top: 18px;
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

  /* Footer section divider */
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
