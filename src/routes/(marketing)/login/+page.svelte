<svelte:head>
  <title>Get Started — Matatu Pulse</title>

    <meta
    name="description"
    content="Choose the appropriate Matatu Pulse sign in or account setup option based on your role."
    />

    <link rel="canonical" href="https://matatupulse.com/login" />

    <meta name="robots" content="noindex,follow" />

</svelte:head>

<div class="intent-wrap">
  <div class="intent-header">
    <div class="intent-eyebrow">Matatu Pulse</div>
    <h1 class="intent-title">How are you<br />using the platform?</h1>
    <p class="intent-sub">
      Choose the option that describes you. We'll route you to the right place.
    </p>
  </div>

  <!-- ══════════════════════════════════════════
       COMMUTERS & RIDERS
       The only role that can self-register.
  ═══════════════════════════════════════════ -->
  <div class="section-label">Commuters & Riders</div>
  <div class="consumer-pair">
    <a href="/login/sign_up" class="intent-card primary stacked">
      <div class="intent-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      </div>
      <div>
        <div class="intent-label">Create Account</div>
        <div class="intent-desc">
          New to Matatu Pulse? Free for riders, always.
        </div>
      </div>
      <div class="card-cta">
        Get started
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      </div>
    </a>

    <a href="/login/sign_in" class="intent-card stacked">
      <div class="intent-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      </div>
      <div>
        <div class="intent-label">Sign In</div>
        <div class="intent-desc">Already have an account.</div>
      </div>
      <div class="card-cta">
        Continue
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      </div>
    </a>
  </div>

  <div class="divider">
    <div class="divider-line"></div>
    <span class="divider-text">Privileged access — invite only</span>
    <div class="divider-line"></div>
  </div>

  <!-- ══════════════════════════════════════════
       DRIVERS & CONDUCTORS — phone OTP
  ═══════════════════════════════════════════ -->
  <div class="section-label">Drivers & Conductors</div>
  <div class="intent-group">
    <a href="/login/driver" class="intent-card">
      <div class="intent-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <rect x="1" y="3" width="15" height="13" />
          <path d="M16 8h4l3 3v5h-7z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </div>
      <div class="intent-copy">
        <div class="intent-label">I'm a Driver or Conductor</div>
        <div class="intent-desc">
          Sign in with your phone number — no password needed
        </div>
      </div>
      <div class="intent-arrow">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      </div>
    </a>
  </div>

  <!-- ══════════════════════════════════════════
       SACCO & OPERATOR STAFF — first-time invite
       Roles: ORG_CHAIR, OPERATIONS_MANAGER,
       COMPLIANCE_OFFICER, ACCOUNTANT,
       ROUTE_SUPERVISOR, STAGE_OPERATOR,
       ORGANIZATION
  ═══════════════════════════════════════════ -->
  <div class="section-label">Sacco & Operator Staff</div>
  <div class="intent-group">
    <a href="/login/invite" class="intent-card">
      <div class="intent-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
          />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <div class="intent-copy">
        <div class="intent-label">I Have an Invitation Code</div>
        <div class="intent-desc">
          First time? Redeem your code to set up your account
        </div>
      </div>
      <div class="intent-arrow">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      </div>
    </a>
  </div>

  <!-- Returning strip — for owners, staff, org chairs who already activated -->
  <div class="returning-strip">
    <p>
      <strong>Already activated your account?</strong> Owners, sacco staff, and operators
      sign back in here.
    </p>
    <a href="/login/sign_in" class="returning-link">
      Sign in
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
      >
    </a>
  </div>

  <!-- OWNER / VEHICLE_OWNER — platform-initiated onboarding only -->
  <div class="owner-callout">
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
      <strong>Matatu / asset owners</strong> — if you own vehicles or a fleet
      and aren't yet on the platform, account setup and sacco linkage are done
      by Matatu Pulse directly.
      <a href="/contact_us?type=partnership">Request onboarding →</a>
    </p>
  </div>

  <!-- ══════════════════════════════════════════
       GOVERNMENT / REGULATORY — federated SSO
  ═══════════════════════════════════════════ -->
  <div class="section-label">Government & Regulatory Bodies</div>
  <div class="alt-actions">
    <a href="/login/sso" class="alt-link">
      <div class="alt-link-icon">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <span class="alt-link-text">
        <strong>Government / Regulatory SSO</strong> — NTSA, NMS, County Transport,
        Planners
      </span>
      <div class="alt-link-arrow">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        >
      </div>
    </a>
  </div>

  <!-- Security notice -->
  <div class="security-notice">
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
      <strong>Roles are never self-assigned.</strong>
      All privileged access is established by Matatu Pulse or your organisation administrator
      before you sign in. You cannot change your own role or organisation through
      any form on this platform.
    </p>
  </div>

  <!-- Trust footer -->
  <div class="trust-footer">
    {#each [{ label: "End-to-end encrypted", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>` }, { label: "No role self-assignment", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` }, { label: "Multi-tenant isolated", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` }] as t}
      <div class="trust-item">{@html t.icon} {t.label}</div>
    {/each}
  </div>
</div>

<style>
  .intent-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .intent-header {
    margin-bottom: 28px;
  }
  .intent-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 10px;
  }
  .intent-title {
    font-family: var(--font-display);
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 6px;
  }
  .intent-sub {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  .section-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .intent-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  /* Rider pair */
  .consumer-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }

  /* Base card */
  .intent-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    text-decoration: none;
    transition:
      border-color 0.2s,
      transform 0.18s,
      background 0.2s;
  }
  .intent-card:hover {
    border-color: rgba(242, 101, 34, 0.35);
  }

  /* Stacked variant for consumer pair */
  .intent-card.stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 20px 18px;
  }
  .intent-card.stacked:hover {
    transform: translateY(-2px);
  }
  .intent-card:not(.stacked):hover {
    transform: translateX(3px);
  }

  /* Orange primary */
  .intent-card.primary {
    background: var(--orange);
    border-color: var(--orange);
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.28);
  }
  .intent-card.primary:hover {
    background: #d95618;
    border-color: #d95618;
    box-shadow: 0 8px 32px rgba(242, 101, 34, 0.42);
  }

  /* Icon */
  .intent-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .intent-card.primary .intent-icon {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
  .intent-card:not(.primary) .intent-icon {
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    color: var(--orange);
  }

  /* Copy */
  .intent-copy {
    flex: 1;
    min-width: 0;
  }
  .intent-label {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .intent-card.primary .intent-label {
    color: #fff;
  }
  .intent-card:not(.primary) .intent-label {
    color: var(--text-1);
  }
  .intent-desc {
    font-size: 0.73rem;
    line-height: 1.45;
  }
  .intent-card.primary .intent-desc {
    color: rgba(255, 255, 255, 0.75);
  }
  .intent-card:not(.primary) .intent-desc {
    color: var(--text-3);
  }

  /* CTA (stacked cards) */
  .card-cta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .intent-card.primary .card-cta {
    color: rgba(255, 255, 255, 0.92);
  }
  .intent-card:not(.primary) .card-cta {
    color: var(--orange);
  }

  /* Arrow (row cards) */
  .intent-arrow {
    flex-shrink: 0;
  }
  .intent-card:not(.primary) .intent-arrow {
    color: var(--text-3);
  }
  .intent-card:not(.primary):hover .intent-arrow {
    color: var(--orange);
  }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 18px;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--rim);
  }
  .divider-text {
    font-size: 0.65rem;
    color: var(--text-3);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* Returning privileged user — sign in link strip */
  .returning-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 11px;
  }
  .returning-strip p {
    font-size: 0.8rem;
    color: var(--text-3);
  }
  .returning-strip strong {
    color: var(--text-2);
    font-weight: 600;
  }
  .returning-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--orange);
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: 12px;
    transition: color 0.2s;
  }
  .returning-link:hover {
    color: #d95618;
  }

  /* Quiet SSO link */
  .alt-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }
  .alt-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: transparent;
    border: 1px solid var(--rim);
    border-radius: 12px;
    text-decoration: none;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .alt-link:hover {
    border-color: var(--rim-2);
    background: rgba(255, 255, 255, 0.02);
  }
  .alt-link-icon {
    color: var(--text-3);
    flex-shrink: 0;
  }
  .alt-link-text {
    font-size: 0.82rem;
    color: var(--text-2);
    flex: 1;
  }
  .alt-link-text strong {
    color: var(--text-1);
    font-weight: 600;
  }
  .alt-link-arrow {
    color: var(--text-3);
    flex-shrink: 0;
  }

  /* Owner callout */
  .owner-callout {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px 15px;
    margin-bottom: 20px;
    background: rgba(0, 176, 155, 0.05);
    border: 1px solid rgba(0, 176, 155, 0.22);
    border-radius: 11px;
  }
  .owner-callout svg {
    color: var(--teal);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .owner-callout p {
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.6;
  }
  .owner-callout strong {
    color: var(--text-1);
    font-weight: 600;
  }
  .owner-callout a {
    color: var(--teal);
    font-weight: 600;
    text-decoration: none;
  }
  .owner-callout a:hover {
    text-decoration: underline;
  }

  /* Security notice */
  .security-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 18px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    border-radius: 10px;
  }
  .security-notice svg {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .security-notice p {
    font-size: 0.75rem;
    color: var(--text-3);
    line-height: 1.55;
  }
  .security-notice strong {
    color: var(--text-2);
    font-weight: 600;
  }

  /* Trust footer */
  .trust-footer {
    padding-top: 16px;
    border-top: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .trust-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    color: var(--text-3);
  }
  .trust-item svg {
    color: var(--teal);
  }

  @media (max-width: 400px) {
    .consumer-pair {
      grid-template-columns: 1fr;
    }
    .intent-card.stacked:hover {
      transform: translateX(3px);
    }
    .returning-strip {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .returning-link {
      margin-left: 0;
    }
  }
</style>
