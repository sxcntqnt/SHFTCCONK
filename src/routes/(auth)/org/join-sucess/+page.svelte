<script lang="ts">
  /**
   * /org/join-success/+page.svelte
   *
   * REPLACED: join code reference, mobilityos.co.ke links
   * WITH: correct next steps matching the actual verification flow:
   *   1. sxcntqnt reviews the request
   *   2. User visits org office for physical verification
   *   3. Once approved — SMS/email notification
   *   4. Login → full ORG_CHAIR dashboard access
   */

  type Data = { orgName: string }
  let { data }: { data: Data } = $props()
</script>

<svelte:head>
  <title>Request submitted — sxcntqnt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="js-root">
  <div class="js-bg"></div>

  <div class="js-card">
    <!-- Success icon -->
    <div class="js-icon">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>

    <h1 class="js-title">Request submitted</h1>
    <p class="js-subtitle">
      Your request to join <strong>{data.orgName}</strong> as ORG_CHAIR has been received.
    </p>

    <!-- What happens next -->
    <div class="js-steps">
      <div class="js-step">
        <div class="js-step-num">1</div>
        <div class="js-step-text">
          <strong>sxcntqnt reviews your request</strong><br />
          Our team will verify the details you submitted.
        </div>
      </div>
      <div class="js-step">
        <div class="js-step-num">2</div>
        <div class="js-step-text">
          <strong>Visit the SACCO office</strong><br />
          Bring your National ID for in-person identity verification.
        </div>
      </div>
      <div class="js-step">
        <div class="js-step-num">3</div>
        <div class="js-step-text">
          <strong>Receive approval notification</strong><br />
          You'll get an SMS or email once your account is activated.
        </div>
      </div>
      <div class="js-step">
        <div class="js-step-num">4</div>
        <div class="js-step-text">
          <strong>Log in and access your dashboard</strong><br />
          As ORG_CHAIR you can manage members, vehicles, and routes.
        </div>
      </div>
    </div>

    <div class="js-actions">
      <a href="/dashboard" class="js-btn-primary">Go to dashboard</a>
      <a href="/org/join-sacco" class="js-btn-secondary"
        >Request another SACCO</a
      >
    </div>

    <p class="js-contact">
      Questions? <a href="mailto:hello@sxcntqnt.com">hello@sxcntqnt.com</a>
    </p>
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
    margin: 0;
  }

  .js-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0c0e13;
    padding: 2rem 1rem;
    position: relative;
    overflow: hidden;
  }
  .js-bg {
    position: fixed;
    inset: 0;
    background: radial-gradient(
      ellipse at 50% 30%,
      rgba(74, 222, 128, 0.05) 0%,
      transparent 60%
    );
    pointer-events: none;
  }

  .js-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 480px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    text-align: center;
  }

  /* Icon */
  .js-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(74, 222, 128, 0.1);
    border: 2px solid rgba(74, 222, 128, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: #4ade80;
  }

  /* Text */
  .js-title {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f0f1f4;
    margin: 0 0 0.5rem;
  }
  .js-subtitle {
    font-size: 0.9rem;
    color: #8b8fa3;
    margin: 0 0 2rem;
    line-height: 1.6;
  }
  .js-subtitle strong {
    color: #e2e4e9;
  }

  /* Steps */
  .js-steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    text-align: left;
  }
  .js-step {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }
  .js-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(168, 85, 247, 0.12);
    border: 1px solid rgba(168, 85, 247, 0.2);
    color: #c084fc;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
  .js-step-text {
    font-size: 0.85rem;
    color: #8b8fa3;
    line-height: 1.55;
  }
  .js-step-text strong {
    color: #d4d7e0;
    display: block;
    margin-bottom: 0.15rem;
  }

  /* Actions */
  .js-actions {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-bottom: 1.5rem;
  }
  .js-btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.85rem;
    font-size: 0.92rem;
    font-weight: 700;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0c0e13;
    background: linear-gradient(135deg, #4ade80, #22c55e);
    border-radius: 12px;
    text-decoration: none;
    transition: filter 0.15s;
  }
  .js-btn-primary:hover {
    filter: brightness(1.08);
  }
  .js-btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.8rem;
    font-size: 0.88rem;
    font-weight: 500;
    font-family: "DM Sans", system-ui, sans-serif;
    color: #8b8fa3;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    text-decoration: none;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .js-btn-secondary:hover {
    border-color: rgba(255, 255, 255, 0.14);
    color: #c8cbd3;
  }

  /* Contact */
  .js-contact {
    font-size: 0.78rem;
    color: #44475a;
    margin: 0;
  }
  .js-contact a {
    color: #6b7084;
    text-decoration: none;
  }
  .js-contact a:hover {
    color: #c084fc;
  }

  @media (max-width: 480px) {
    .js-card {
      padding: 2rem 1.25rem;
      border-radius: 16px;
    }
  }
</style>
