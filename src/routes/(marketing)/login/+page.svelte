<svelte:head>
  <title>Sign In — Matatu Pulse</title>
</svelte:head>

<style>
  /* ── Page wrapper ── */
  .intent-wrap { width: 100%; display: flex; flex-direction: column; gap: 0; }

  /* Header */
  .intent-header { margin-bottom: 32px; }
  .intent-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .intent-title {
    font-family: var(--font-display); font-size: 1.7rem;
    font-weight: 800; letter-spacing: -0.04em; color: var(--text-1);
    line-height: 1.15; margin-bottom: 6px;
  }
  .intent-sub { font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }

  /* Section label */
  .section-label {
    font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-3); margin-bottom: 8px;
    padding-left: 2px;
  }

  /* Intent cards */
  .intent-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }

  .intent-card {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 14px; text-decoration: none;
    transition: border-color 0.2s, transform 0.18s, background 0.2s;
    cursor: pointer;
  }
  .intent-card:hover { border-color: rgba(242,101,34,0.35); transform: translateX(4px); }
  .intent-card.primary {
    background: var(--orange); border-color: var(--orange);
    box-shadow: 0 4px 20px rgba(242,101,34,0.28);
  }
  .intent-card.primary:hover {
    background: #d95618; border-color: #d95618;
    box-shadow: 0 8px 32px rgba(242,101,34,0.42);
    transform: translateX(4px);
  }

  /* Icon */
  .intent-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .intent-card.primary .intent-icon {
    background: rgba(255,255,255,0.18); color: #fff;
  }
  .intent-card:not(.primary) .intent-icon {
    background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2);
    color: var(--orange);
  }

  /* Copy */
  .intent-copy { flex: 1; min-width: 0; }
  .intent-label {
    font-family: var(--font-display); font-size: 0.9rem; font-weight: 700;
    line-height: 1.2; margin-bottom: 2px;
  }
  .intent-card.primary .intent-label { color: #fff; }
  .intent-card:not(.primary) .intent-label { color: var(--text-1); }
  .intent-desc { font-size: 0.75rem; }
  .intent-card.primary .intent-desc { color: rgba(255,255,255,0.72); }
  .intent-card:not(.primary) .intent-desc { color: var(--text-3); }

  /* Arrow */
  .intent-arrow { flex-shrink: 0; }
  .intent-card.primary .intent-arrow { color: rgba(255,255,255,0.6); }
  .intent-card:not(.primary) .intent-arrow { color: var(--text-3); }
  .intent-card:hover .intent-arrow { color: rgba(255,255,255,0.95); }
  .intent-card:not(.primary):hover .intent-arrow { color: var(--orange); }

  /* Divider */
  .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
  .divider-line { flex: 1; height: 1px; background: var(--rim); }
  .divider-text { font-size: 0.68rem; color: var(--text-3); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }

  /* Invite / SSO strip */
  .alt-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
  .alt-link {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px;
    background: transparent; border: 1px solid var(--rim);
    border-radius: 12px; text-decoration: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .alt-link:hover { border-color: var(--rim-2); background: rgba(255,255,255,0.02); }
  .alt-link-icon { color: var(--text-3); flex-shrink: 0; }
  .alt-link-text { font-size: 0.82rem; color: var(--text-2); }
  .alt-link-text strong { color: var(--text-1); font-weight: 600; }
  .alt-link-arrow { margin-left: auto; color: var(--text-3); flex-shrink: 0; }

  /* Trust footer */
  .trust-footer {
    padding-top: 18px; border-top: 1px solid var(--rim);
    display: flex; align-items: center; justify-content: center;
    gap: 18px; flex-wrap: wrap;
  }
  .trust-item { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; color: var(--text-3); }
  .trust-item svg { color: var(--teal); }

  /* Security notice */
  .security-notice {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; margin-bottom: 20px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--rim);
    border-radius: 10px;
  }
  .security-notice svg { color: var(--text-3); flex-shrink: 0; margin-top: 1px; }
  .security-notice p { font-size: 0.75rem; color: var(--text-3); line-height: 1.55; }
  .security-notice strong { color: var(--text-2); font-weight: 600; }
</style>

<div class="intent-wrap">

  <div class="intent-header">
    <div class="intent-eyebrow">Matatu Pulse</div>
    <h1 class="intent-title">How are you<br/>using the platform?</h1>
    <p class="intent-sub">Choose the option that best describes you. We'll route you correctly.</p>
  </div>

  <!-- ── CONSUMER ── -->
  <div class="section-label">Commuters & Riders</div>
  <div class="intent-group">
    <a href="/login/sign_in" class="intent-card primary">
      <div class="intent-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="intent-copy">
        <div class="intent-label">I'm a Commuter / Rider</div>
        <div class="intent-desc">Track matatus, set arrival alerts, plan your route</div>
      </div>
      <div class="intent-arrow">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  </div>

  <!-- ── OPERATIONAL ── -->
  <div class="section-label">Drivers & Conductors</div>
  <div class="intent-group">
    <a href="/login/driver" class="intent-card">
      <div class="intent-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
      <div class="intent-copy">
        <div class="intent-label">I'm a Driver or Conductor</div>
        <div class="intent-desc">Sign in with your phone number using an OTP code</div>
      </div>
      <div class="intent-arrow">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  </div>

  <div class="divider">
    <div class="divider-line"></div>
    <span class="divider-text">Organisation & Authority access</span>
    <div class="divider-line"></div>
  </div>

  <!-- ── ORGANISATIONAL ── -->
  <div class="section-label">Sacco & Operator Staff</div>
  <div class="intent-group">
    <a href="/login/invite" class="intent-card">
      <div class="intent-icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <div class="intent-copy">
        <div class="intent-label">I have an Invitation</div>
        <div class="intent-desc">Operator, manager, accountant, or compliance staff — enter your invite code</div>
      </div>
      <div class="intent-arrow">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  </div>

  <!-- ── REGULATORY / SSO ── -->
  <div class="section-label">Government & Regulatory Bodies</div>
  <div class="alt-actions">
    <a href="/login/sso" class="alt-link">
      <div class="alt-link-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <span class="alt-link-text"><strong>Government / Regulatory SSO</strong> — NTSA, NMS, County Transport</span>
      <div class="alt-link-arrow">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  </div>

  <!-- Security notice -->
  <div class="security-notice">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    <p><strong>Roles are never self-assigned.</strong> Your access level is set by your organisation administrator or by Matatu Pulse during onboarding. You cannot elevate your own permissions.</p>
  </div>

  <!-- Trust footer -->
  <div class="trust-footer">
    {#each [
      { label:"End-to-end encrypted", icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>` },
      { label:"No role self-assignment", icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
      { label:"Multi-tenant isolated", icon:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
    ] as t}
      <div class="trust-item">{@html t.icon} {t.label}</div>
    {/each}
  </div>

</div>