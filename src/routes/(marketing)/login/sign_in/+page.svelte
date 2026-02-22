<script lang="ts">
  import { Auth } from "@supabase/auth-ui-svelte"
  import { sharedAppearance, oauthProviders } from "../login_config"
  import { goto } from "$app/navigation"
  import { onMount } from "svelte"
  import { page } from "$app/stores"
  import { setUserFromBootstrap } from "$lib/features/auth/stores/auth"

  export let data
  $: supabase = data?.supabase

  onMount(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN") return

      setTimeout(async () => {
        try {
          const { data: rpcData, error } = await supabase.rpc("bootstrap_session")
          if (error) {
            console.error("bootstrap_session error", error)
            goto("/account")
            return
          }
          const payload = Array.isArray(rpcData) ? rpcData[0] : rpcData
          // Hydrate the store — role comes from server, never UI
          setUserFromBootstrap(payload)
          goto(payload?.route ?? "/account")
        } catch (e) {
          console.error(e)
          goto("/account")
        }
      }, 250)
    })
  })
</script>

<svelte:head>
  <title>Sign In — Matatu Pulse</title>
</svelte:head>

<style>
  .signin-wrap { width: 100%; }

  .page-header { margin-bottom: 28px; }
  .page-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display); font-size: 1.6rem; font-weight: 800;
    letter-spacing: -0.04em; color: var(--text-1); line-height: 1.15; margin-bottom: 6px;
  }
  .page-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* Verified alert */
  .alert-verified {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; margin-bottom: 20px;
    background: rgba(0,176,155,0.08); border: 1px solid rgba(0,176,155,0.25);
    border-radius: 10px;
  }
  .alert-verified svg { color: var(--teal); flex-shrink: 0; }
  .alert-verified span { font-size: 0.875rem; color: var(--text-1); font-weight: 500; }

  /* Auth wrapper */
  .auth-wrap { margin-bottom: 18px; }

  /* Footer */
  .auth-footer { padding-top: 16px; border-top: 1px solid var(--rim); display: flex; flex-direction: column; gap: 8px; }
  .auth-footer-row { font-size: 0.82rem; color: var(--text-3); }
  .auth-footer-row a { color: var(--orange); text-decoration: none; font-weight: 600; transition: color 0.2s; }
  .auth-footer-row a:hover { color: #d95618; }

  /* Divider */
  .divider { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
  .divider-line { flex: 1; height: 1px; background: var(--rim); }
  .divider-text { font-size: 0.68rem; color: var(--text-3); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
</style>

<div class="signin-wrap">

  <div class="page-header">
    <div class="page-eyebrow">Commuter & Rider Access</div>
    <h1 class="page-title">Sign In</h1>
    <p class="page-sub">Access your route tracker, alerts, and account settings.</p>
  </div>

  {#if $page.url.searchParams.get("verified") === "true"}
    <div class="alert-verified" role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>Email verified — you can now sign in.</span>
    </div>
  {/if}

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

  <div class="auth-footer">
    <div class="auth-footer-row"><a href="/login/forgot_password">Forgot your password?</a></div>
    <div class="divider"><div class="divider-line"></div><span class="divider-text">other access</span><div class="divider-line"></div></div>
    <div class="auth-footer-row">Sacco / operator staff? <a href="/login/invite">Use your invitation code</a></div>
    <div class="auth-footer-row">Driver or conductor? <a href="/login/driver">Sign in with phone OTP</a></div>
    <div class="auth-footer-row">Government / authority? <a href="/login/sso">Use your organisation SSO</a></div>
    <div class="auth-footer-row">New rider? <a href="/login/sign_up">Create a free account</a></div>
  </div>

</div>