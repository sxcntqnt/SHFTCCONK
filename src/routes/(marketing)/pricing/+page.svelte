<script lang="ts">
  import PricingModule from "./pricing_module.svelte"
  import { WebsiteName } from "./../../../config"

  type PlanFeatureRow = {
    name: string
    freeIncluded?: boolean
    proIncluded?: boolean
    freeString?: string
    proString?: string
    header?: boolean
  }

  const planFeatures: PlanFeatureRow[] = [
    { name: "Core Access", header: true },
    { name: "Live Feed", freeIncluded: true, proIncluded: true },
    { name: "Trip Planner", freeIncluded: false, proIncluded: true },
    { name: "Route Alerts", freeString: "3", proString: "Unlimited" },
    { name: "Fleet & Operations", header: true },
    { name: "Fleet Manager", freeIncluded: true, proIncluded: true },
    { name: "Telemetry Sync", freeIncluded: false, proIncluded: true },
    { name: "Geofences", freeString: "5", proString: "Unlimited" },
    { name: "Analytics & Reports", header: true },
    { name: "Insights Snapshot", freeIncluded: true, proIncluded: true },
    { name: "Custom Reports", freeIncluded: false, proIncluded: true },
    { name: "Data Export", freeIncluded: false, proIncluded: true },
  ]

  type FaqItem = { q: string; a: string; open?: boolean }
  let faqs = $state<FaqItem[]>([
    {
      q: "Is there a free plan?",
      a: "Yes — you can get started with the Free tier at no cost. It covers core features for individual passengers and small operators.",
    },
    {
      q: "Can I switch plans at any time?",
      a: "Absolutely. Upgrades take effect immediately, and downgrades apply at the end of your current billing cycle. No lock-in.",
    },
    {
      q: "How does billing work?",
      a: "Plans are billed monthly or annually. Annual billing gives you a significant discount. You'll be charged via Stripe — we never store card details directly.",
    },
    {
      q: "Can I test the payment flow without a real card?",
      a: "Yes. Use Stripe's test card 4242 4242 4242 4242 with any future expiry date to simulate the full purchase and upgrade flow.",
    },
    {
      q: "What happens if I cancel?",
      a: "Your account reverts to the Free tier at the end of the paid period. Your data is retained — nothing is deleted.",
    },
  ])

  function toggleFaq(i: number) {
    faqs = faqs.map((f, idx) => (idx === i ? { ...f, open: !f.open } : f))
  }
</script>

<svelte:head>
  <title>Pricing — {WebsiteName}</title>
  <meta
    name="description"
    content="Simple, transparent pricing for {WebsiteName}"
  />
</svelte:head>

<div class="pricing-page">
  <!-- ── Hero ── -->
  <div class="pricing-hero">
    <div class="hero-eyebrow">
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
      Simple Pricing
    </div>
    <h1 class="hero-title">Scale from free<br />to <em>enterprise</em></h1>
    <p class="hero-sub">
      No surprises. Start free, upgrade when you need more.
    </p>
  </div>

  <!-- ── Pricing cards ── -->
  <div class="module-wrap">
    <PricingModule callToAction="Get Started" highlightedPlanId="pro" />
  </div>

  <!-- ── FAQ ── -->
  <div class="section-head">
    <h2 class="section-title">Frequently asked</h2>
    <p class="section-sub">Everything you need to know about pricing.</p>
  </div>

  <div class="faq-list">
    {#each faqs as faq, i}
      <div class="faq-item {faq.open ? 'open' : ''}">
        <button class="faq-trigger" onclick={() => toggleFaq(i)}>
          {faq.q}
          <svg
            class="faq-chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {#if faq.open}
          <div class="faq-body">{faq.a}</div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- ── Feature comparison table ── -->
  <div class="section-head">
    <h2 class="section-title">Plan features</h2>
    <p class="section-sub">A full breakdown of what's included at each tier.</p>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:55%;">Feature</th>
          <th>Free</th>
          <th>Pro</th>
        </tr>
      </thead>
      <tbody>
        {#each planFeatures as feature}
          {#if feature.header}
            <tr class="section-row">
              <td colspan="3">{feature.name}</td>
            </tr>
          {:else}
            <tr class="feature-row">
              <td>{feature.name}</td>

              <!-- Free column -->
              <td>
                {#if feature.freeString}
                  <span class="feature-string">{feature.freeString}</span>
                {:else if feature.freeIncluded}
                  <span class="check-icon">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                {:else}
                  <span class="cross-icon">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                {/if}
              </td>

              <!-- Pro column -->
              <td>
                {#if feature.proString}
                  <span class="feature-string">{feature.proString}</span>
                {:else if feature.proIncluded}
                  <span class="check-icon">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                {:else}
                  <span class="cross-icon">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  /* ── Page ── */
  .pricing-page {
    min-height: 70vh;
    padding: 72px 24px 96px;
    font-family: var(--font-body);
    background: var(--ink);
    position: relative;
    overflow: hidden;
  }

  /* Atmospheric gradients */
  .pricing-page::before {
    content: "";
    position: fixed;
    top: -120px;
    right: -120px;
    width: 560px;
    height: 560px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }
  .pricing-page::after {
    content: "";
    position: fixed;
    bottom: -100px;
    left: -100px;
    width: 440px;
    height: 440px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.05),
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }

  /* ── Hero header ── */
  .pricing-hero {
    text-align: center;
    margin-bottom: 56px;
    position: relative;
    z-index: 1;
  }

  .hero-eyebrow {
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
    padding: 5px 14px;
    border-radius: 100px;
    margin-bottom: 22px;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1.05;
    color: var(--text-1);
    margin-bottom: 14px;
  }
  .hero-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-sub {
    font-size: 0.95rem;
    color: var(--text-3);
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.65;
  }

  /* ── Module wrapper ── */
  .module-wrap {
    position: relative;
    z-index: 1;
    margin-bottom: 96px;
  }

  /* ── Section heading ── */
  .section-head {
    text-align: center;
    margin-bottom: 36px;
    position: relative;
    z-index: 1;
  }
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 3vw, 1.9rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .section-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── FAQ accordion ── */
  .faq-list {
    max-width: 580px;
    margin: 0 auto 96px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .faq-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .faq-item.open {
    border-color: rgba(242, 101, 34, 0.25);
    background: rgba(242, 101, 34, 0.04);
  }

  .faq-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 16px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-1);
    text-align: left;
    gap: 12px;
  }
  .faq-trigger:hover {
    color: var(--text-1);
  }

  .faq-chevron {
    flex-shrink: 0;
    color: var(--text-3);
    transition:
      transform 0.22s ease,
      color 0.2s;
  }
  .faq-item.open .faq-chevron {
    transform: rotate(180deg);
    color: var(--orange);
  }

  .faq-body {
    padding: 0 20px 18px;
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.7;
  }
  .faq-body a {
    color: var(--orange);
    text-decoration: none;
    border-bottom: 1px solid rgba(242, 101, 34, 0.3);
    transition: border-color 0.15s;
  }
  .faq-body a:hover {
    border-color: rgba(242, 101, 34, 0.7);
  }

  /* ── Feature table ── */
  .table-wrap {
    max-width: 580px;
    margin: 0 auto;
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead tr {
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--rim);
  }
  th {
    padding: 14px 18px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    text-align: center;
  }
  th:first-child {
    text-align: left;
  }

  /* Section header rows */
  tr.section-row td {
    padding: 10px 18px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.05);
    border-top: 1px solid rgba(242, 101, 34, 0.12);
    border-bottom: 1px solid rgba(242, 101, 34, 0.08);
  }

  /* Feature rows */
  tr.feature-row {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }
  tr.feature-row:last-child {
    border-bottom: none;
  }
  tr.feature-row:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  td {
    padding: 13px 18px;
    font-size: 0.875rem;
    color: var(--text-2);
    vertical-align: middle;
    text-align: center;
  }
  td:first-child {
    text-align: left;
    color: var(--text-1);
  }

  /* Check / cross inline icons */
  .check-icon {
    color: var(--teal);
    display: inline-block;
  }
  .cross-icon {
    color: rgba(255, 255, 255, 0.15);
    display: inline-block;
  }

  /* String values (e.g. "3" or "Unlimited") */
  .feature-string {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-2);
  }
  td:last-child .feature-string {
    color: var(--orange);
  }
</style>
