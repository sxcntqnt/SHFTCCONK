<script lang="ts">
  import { goto } from "$app/navigation"

  let { data } = $props()

  let loading = $state<string | null>(null)
  let error = $state<string | null>(null)

  // Known SSO providers — each maps to a Supabase SAML/OIDC provider slug
  // configured in the Supabase dashboard under Auth → SSO Providers.
  // For MVP, Google OAuth with hd= domain restriction is used as a proxy.
  const SSO_PROVIDERS = [
    {
      id: "ntsa",
      name: "NTSA",
      fullName: "National Transport & Safety Authority",
      domain: "ntsa.go.ke",
      logo: "🇰🇪",
      provider: "google", // or "saml" once SAML is configured
      hd: "ntsa.go.ke",
    },
    {
      id: "nms",
      name: "NMS",
      fullName: "Nairobi Metropolitan Services",
      domain: "nms.go.ke",
      logo: "🏙️",
      provider: "google",
      hd: "nms.go.ke",
    },
    {
      id: "nairobi_county",
      name: "Nairobi County",
      fullName: "Nairobi City County Government",
      domain: "nairobi.go.ke",
      logo: "🏛️",
      provider: "google",
      hd: "nairobi.go.ke",
    },
    {
      id: "kenha",
      name: "KeNHA",
      fullName: "Kenya National Highways Authority",
      domain: "kenha.co.ke",
      logo: "🛣️",
      provider: "google",
      hd: "kenha.co.ke",
    },
    {
      id: "research",
      name: "Research / Planning Partner",
      fullName: "Academic, NGO & Development Planning",
      domain: null,
      logo: "📊",
      provider: "google",
      hd: null, // any Google account — access gated by manual approval
    },
  ] as const

  async function signInWithSSO(
    provId: string,
    hd: string | null,
    provider: string,
  ) {
    error = null
    loading = provId
    try {
      const options: Record<string, any> = {
        redirectTo: `${window.location.origin}/auth/callback?next=/account`,
      }
      // Restrict to the authority's domain when known
      if (hd) {
        options.queryParams = { hd }
      }
      const { error: supaErr } = await data.supabase.auth.signInWithOAuth({
        provider: provider as any,
        options,
      })
      if (supaErr) throw supaErr
      // Supabase redirects — nothing else to do here
    } catch (e: any) {
      error = e.message ?? "SSO redirect failed. Please try again."
      loading = null
    }
  }
</script>

<svelte:head>
  <title>Government & Authority Sign In — Matatu Pulse</title>
</svelte:head>

<div class="sso-wrap">
  <div class="page-header">
    <div class="page-eyebrow">Regulatory & Government Access</div>
    <h1 class="page-title">Sign In with<br />Your Organisation</h1>
    <p class="page-sub">
      Authenticate with your government-issued credentials. We never store your
      institutional password.
    </p>
  </div>

  <div class="role-pills">
    <span class="role-pill">Regulator</span>
    <span class="role-pill">Planner</span>
    <span class="role-pill">Government Authority</span>
    <span class="role-pill">Research Partner</span>
  </div>

  <div class="security-banner">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
    <p>
      <strong>Federated authentication only.</strong> You authenticate against your
      own organisation's identity provider. Matatu Pulse never sees your institutional
      credentials. Access is domain-restricted and verified against a pre-approved
      list.
    </p>
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

  <div class="provider-list">
    {#each SSO_PROVIDERS as p}
      <button
        class="provider-btn"
        onclick={() => signInWithSSO(p.id, p.hd, p.provider)}
        disabled={!!loading}
      >
        <div class="provider-logo">{p.logo}</div>
        <div class="provider-info">
          <div class="provider-name">{p.name}</div>
          <div class="provider-full">{p.fullName}</div>
        </div>
        {#if p.hd}
          <span class="provider-domain">@{p.hd}</span>
        {/if}
        {#if loading === p.id}
          <div class="spinner"></div>
        {:else}
          <div class="provider-arrow">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
            >
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <div class="approval-note">
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
    <p>
      First-time access requires approval from Matatu Pulse. SSO sign-in will
      succeed, but <strong
        >dashboard access is enabled within one business day</strong
      >
      of your initial sign-in. Contact
      <a
        href="mailto:gov@matatupulse.co.ke"
        style="color:var(--orange);font-weight:600;">gov@matatupulse.co.ke</a
      > to expedite.
    </p>
  </div>

  <div class="auth-footer">
    <div class="auth-footer-row">
      Your organisation isn't listed? <a href="/contact_us?type=regulatory"
        >Request access</a
      >
    </div>
    <div class="auth-footer-row">
      Not a regulator? <a href="/login">Back to all sign-in options</a>
    </div>
  </div>
</div>

<style>
  .sso-wrap {
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

  /* Role pills */
  .role-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 22px;
  }
  .role-pill {
    padding: 3px 9px;
    border-radius: 100px;
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    color: var(--text-3);
  }

  /* Security banner */
  .security-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 22px;
    background: rgba(242, 101, 34, 0.05);
    border: 1px solid rgba(242, 101, 34, 0.18);
    border-radius: 10px;
  }
  .security-banner svg {
    color: var(--orange);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .security-banner p {
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.55;
  }
  .security-banner strong {
    color: var(--text-1);
  }

  /* Provider list */
  .provider-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 22px;
  }
  .provider-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 13px;
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.2s,
      transform 0.18s,
      background 0.2s;
  }
  .provider-btn:hover:not(:disabled) {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateX(3px);
  }
  .provider-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .provider-logo {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    flex-shrink: 0;
    background: var(--ink-2);
    border: 1px solid var(--rim-2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }
  .provider-info {
    flex: 1;
    min-width: 0;
  }
  .provider-name {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 1px;
  }
  .provider-full {
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .provider-domain {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    padding: 2px 7px;
    border-radius: 100px;
    background: rgba(0, 176, 155, 0.1);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.22);
    flex-shrink: 0;
  }
  .provider-arrow {
    color: var(--text-3);
    flex-shrink: 0;
    transition: color 0.2s;
  }
  .provider-btn:hover .provider-arrow {
    color: var(--orange);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(242, 101, 34, 0.3);
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* Approval note */
  .approval-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 20px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 10px;
  }
  .approval-note svg {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .approval-note p {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
  }
  .approval-note strong {
    color: var(--text-2);
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
  }

  /* Footer */
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
  }
  .auth-footer-row a:hover {
    color: #d95618;
  }
</style>
