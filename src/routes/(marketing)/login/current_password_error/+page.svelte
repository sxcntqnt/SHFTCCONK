<svelte:head>
  <title>Incorrect Password — Matatu Pulse</title>
</svelte:head>

<div class="error-wrap">
  <div class="error-icon-wrap">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  </div>

  <div class="page-eyebrow">Security alert</div>
  <h1 class="page-title">Incorrect Password</h1>

  <p class="page-body">
    You attempted to update your account using an incorrect current password.
    For security, you've been signed out.
  </p>
  <p class="page-body">
    This is a precaution — your account is safe. Simply sign back in with the
    correct credentials to try again.
  </p>

  <div class="action-group">
    <a href="/login/sign_in" class="btn-primary">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Sign Back In
    </a>

    <div class="divider">
      <div class="divider-line"></div>
      <span class="divider-text">or</span>
      <div class="divider-line"></div>
    </div>

    <a href="/login/forgot_password" class="btn-outline">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Reset My Password
    </a>
  </div>

  <div class="security-note">
    <div class="security-note-icon">
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
    </div>
    <p class="security-note-text">
      If you didn't attempt this action, your password may be compromised. Reset
      it immediately and contact us at <a
        href="mailto:support@matatupulse.co.ke"
        style="color:var(--orange);">support@matatupulse.co.ke</a
      >.
    </p>
  </div>
</div>

<style>
  .error-wrap {
    width: 100%;
  }

  /* Icon lockup */
  .error-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f87171;
    margin-bottom: 22px;
  }

  .page-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f87171;
    margin-bottom: 10px;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .page-body {
    font-size: 0.9rem;
    color: var(--text-2);
    line-height: 1.75;
    margin-bottom: 12px;
  }
  .page-body:last-of-type {
    margin-bottom: 32px;
  }

  /* Action buttons */
  .action-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.3);
    transition:
      background 0.2s,
      transform 0.15s;
  }
  .btn-primary:hover {
    background: #d95618;
    transform: translateY(-1px);
  }

  .btn-outline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: transparent;
    border: 1px solid var(--rim-2);
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 12px;
    cursor: pointer;
    text-decoration: none;
    transition:
      border-color 0.2s,
      color 0.2s;
  }
  .btn-outline:hover {
    border-color: var(--rim);
    color: var(--text-1);
  }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--rim);
  }
  .divider-text {
    font-size: 0.7rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }

  /* Security note */
  .security-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 28px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 12px;
  }
  .security-note-icon {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .security-note-text {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
  }
</style>
