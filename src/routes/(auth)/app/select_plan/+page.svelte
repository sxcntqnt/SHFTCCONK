<script lang="ts">
  import PricingModule from "../../../(marketing)/pricing/pricing_module.svelte"
</script>

<svelte:head>
  <title>Select a Plan — Matatu Pulse</title>
</svelte:head>

<div class="plan-page">
  <!-- Header -->
  <div class="plan-header">
    <div class="header-eyebrow">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
      Choose Your Plan
    </div>
    <h1 class="plan-title">Unlock the full<br /><em>Matatu Pulse</em></h1>
    <p class="plan-sub">
      Start free, upgrade when you're ready. See our <a
        href="/pricing"
        target="_blank">full pricing page</a
      > for a detailed breakdown.
    </p>
  </div>

  <!-- Pricing module -->
  <div class="pricing-wrap">
    <PricingModule callToAction="Select Plan" />
  </div>

  <!-- Trust strip -->
  <div class="trust-strip">
    <div class="trust-item">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      No credit card required to start
    </div>
    <div class="trust-sep"></div>
    <div class="trust-item">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Cancel or switch plans anytime
    </div>
    <div class="trust-sep"></div>
    <div class="trust-item">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      Data stays in-region
    </div>
  </div>
</div>

<style>
  /* ── Page shell ── */
  .plan-page {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 60px 24px 80px;
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  /* Atmospheric gradients */
  .plan-page::before {
    content: "";
    position: fixed;
    top: -100px;
    right: -100px;
    width: 500px;
    height: 500px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
    pointer-events: none;
  }
  .plan-page::after {
    content: "";
    position: fixed;
    bottom: -100px;
    left: -100px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
    pointer-events: none;
  }

  /* ── Header ── */
  .plan-header {
    text-align: center;
    margin-bottom: 52px;
    max-width: 520px;
  }

  .header-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.18);
    padding: 5px 12px;
    border-radius: 100px;
    margin-bottom: 20px;
  }

  .plan-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1.05;
    color: var(--text-1);
    margin-bottom: 14px;
  }
  .plan-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .plan-sub {
    font-size: 0.9rem;
    color: var(--text-3);
    line-height: 1.65;
  }
  .plan-sub a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 1px solid rgba(242, 101, 34, 0.3);
    transition: border-color 0.15s;
  }
  .plan-sub a:hover {
    border-color: rgba(242, 101, 34, 0.7);
  }

  /* ── Pricing module wrapper ── */
  .pricing-wrap {
    width: 100%;
    max-width: 1000px;
    position: relative;
    z-index: 1;
  }

  /* ── Trust strip ── */
  .trust-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-top: 48px;
    flex-wrap: wrap;
  }
  .trust-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .trust-item svg {
    color: var(--teal);
    flex-shrink: 0;
  }
  .trust-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--rim-2);
    flex-shrink: 0;
  }
  @media (max-width: 480px) {
    .trust-sep {
      display: none;
    }
    .trust-strip {
      flex-direction: column;
      gap: 12px;
    }
  }
</style>
