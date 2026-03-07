<script lang="ts">
  import PricingPl from "./pricing_module.svelte"
  import { WebsiteName } from "$lib/../config"

  type PlanFeatureRow = {
    name: string
    header?: boolean
    freeIncluded?: boolean
    starterIncluded?: boolean
    proIncluded?: boolean
    businessIncluded?: boolean
    enterpriseIncluded?: boolean
    freeString?: string
    starterString?: string
    proString?: string
    businessString?: string
    enterpriseString?: string
  }

  const planFeatures: PlanFeatureRow[] = [
    { name: "Core Access", header: true },
    {
      name: "Live Feed",
      freeIncluded: true,
      starterIncluded: true,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Trip Planner",
      freeIncluded: false,
      starterIncluded: true,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Route Alerts",
      freeString: "3",
      starterString: "25",
      proString: "Unlimited",
      businessString: "Unlimited",
      enterpriseString: "Unlimited",
    },

    { name: "Fleet & Operations", header: true },
    {
      name: "Fleet Manager",
      freeIncluded: true,
      starterIncluded: true,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Telemetry Sync",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Geofences",
      freeString: "5",
      starterString: "50",
      proString: "Unlimited",
      businessString: "Unlimited",
      enterpriseString: "Unlimited",
    },

    { name: "Analytics & Reports", header: true },
    {
      name: "Insights Snapshot",
      freeIncluded: true,
      starterIncluded: true,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Custom Reports",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "Data Export",
      freeIncluded: false,
      starterIncluded: true,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },

    { name: "Team & Support", header: true },
    {
      name: "User Seats",
      freeString: "1",
      starterString: "5",
      proString: "Unlimited",
      businessString: "Volume Pricing",
      enterpriseString: "Custom",
    },
    {
      name: "Support Level",
      freeString: "Community",
      starterString: "Email (48h)",
      proString: "Priority (24h)",
      businessString: "Dedicated",
      enterpriseString: "24/7 Premium",
    },
    {
      name: "API Access",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: true,
      businessIncluded: true,
      enterpriseIncluded: true,
    },

    { name: "Enterprise", header: true },
    {
      name: "Custom Integrations",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: false,
      businessIncluded: true,
      enterpriseIncluded: true,
    },
    {
      name: "SOC2 Compliance",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: false,
      businessIncluded: false,
      enterpriseIncluded: true,
    },
    {
      name: "On-Premise Option",
      freeIncluded: false,
      starterIncluded: false,
      proIncluded: false,
      businessIncluded: false,
      enterpriseIncluded: true,
    },
  ]

  type FaqItem = { q: string; a: string; open?: boolean }
  let faqs = $state<FaqItem[]>([
    {
      q: "Is there a free plan?",
      a: "Yes — start with the Free tier at no cost. It covers core features for individual users and small operators. Upgrade to Starter ($9/mo) for more capacity.",
    },
    {
      q: "What's the difference between Pro and Business?",
      a: "Pro ($29/mo) is perfect for solo professionals needing unlimited everything. Business ($49/user/mo) adds team collaboration, volume discounts, and dedicated support.",
    },
    {
      q: "How does volume pricing work for Business?",
      a: "Per-user pricing drops with scale: $49 (1–9 users), $39 (10–49), $29 (50+). Contact sales for custom quotes above 50 seats.",
    },
    {
      q: "Can I switch plans anytime?",
      a: "Yes. Upgrades are instant; downgrades apply at billing cycle end. Enterprise plans use custom contracts with flexible terms.",
    },
    {
      q: "How does Enterprise pricing work?",
      a: "Custom pricing is value-based and negotiated. Starts around $199/user depending on scale, features, and SLAs. Book a call with sales for a quote.",
    },
    {
      q: "Test payments without a real card?",
      a: "Use Stripe test card 4242 4242 4242 4242 (any future expiry, any CVC) to simulate purchases across all paid tiers.",
    },
    {
      q: "What happens if I cancel?",
      a: "Paid accounts revert to Free at period end. Your data stays intact — upgrade again anytime.",
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
    content="Tiered pricing from Free to Enterprise for {WebsiteName}"
  />
</svelte:head>

<div class="pricing-page">
  <!-- Hero -->
  <div class="hero">
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
      Tiered Pricing
    </div>
    <h1 class="hero-title">
      Scale from <em>free</em><br />to <em>enterprise</em>
    </h1>
    <p class="hero-sub">
      Individuals to large teams. Pay for what you need, when you need it.
    </p>
    <div class="trust-strip">
      <div class="trust-item">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
        >
        No credit card for Free
      </div>
      <div class="trust-item">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
        >
        Cancel anytime
      </div>
      <div class="trust-item">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg
        >
        Instant upgrades
      </div>
    </div>
  </div>

  <!-- Pricing cards -->
  <div class="module-wrap">
    <PricingModule callToAction="Get Started" highlightedPlanId="pro" />
  </div>

  <!-- FAQ -->
  <div class="section-head">
    <h2 class="section-title">Frequently asked</h2>
    <p class="section-sub">Everything about our tiered plans and billing.</p>
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

  <!-- Feature comparison -->
  <div class="section-head">
    <h2 class="section-title">Feature comparison</h2>
    <p class="section-sub">
      Everything included at each tier, from Free to Enterprise.
    </p>
  </div>

  <div class="table-wrap">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free</th>
            <th>Starter</th>
            <th>Pro</th>
            <th>Business</th>
            <th>Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {#each planFeatures as f}
            {#if f.header}
              <tr class="section-row"><td colspan="6">{f.name}</td></tr>
            {:else}
              <tr class="feature-row">
                <td>{f.name}</td>

                <!-- Free -->
                <td
                  >{#if f.freeString}<span class="feat-str">{f.freeString}</span
                    >
                  {:else if f.freeIncluded}
                    <svg
                      class="check-svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  {:else}
                    <svg
                      class="cross-svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                  {/if}</td
                >

                <!-- Starter -->
                <td
                  >{#if f.starterString}<span class="feat-str"
                      >{f.starterString}</span
                    >
                  {:else if f.starterIncluded}
                    <svg
                      class="check-svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  {:else}
                    <svg
                      class="cross-svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                  {/if}</td
                >

                <!-- Pro -->
                <td
                  >{#if f.proString}<span class="feat-str">{f.proString}</span>
                  {:else if f.proIncluded}
                    <svg
                      class="check-svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  {:else}
                    <svg
                      class="cross-svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                  {/if}</td
                >

                <!-- Business -->
                <td
                  >{#if f.businessString}<span class="feat-str"
                      >{f.businessString}</span
                    >
                  {:else if f.businessIncluded}
                    <svg
                      class="check-svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  {:else}
                    <svg
                      class="cross-svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                  {/if}</td
                >

                <!-- Enterprise -->
                <td
                  >{#if f.enterpriseString}<span class="feat-str"
                      >{f.enterpriseString}</span
                    >
                  {:else if f.enterpriseIncluded}
                    <svg
                      class="check-svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  {:else}
                    <svg
                      class="cross-svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      ><line x1="18" y1="6" x2="6" y2="18" /><line
                        x1="6"
                        y1="6"
                        x2="18"
                        y2="18"
                      /></svg
                    >
                  {/if}</td
                >
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  /* ── Page ────────────────────────────────────────────────────────────────── */
  .pricing-page {
    min-height: 100vh;
    padding: 80px 24px 100px;
    font-family: var(--font-body);
    background: var(--ink);
    position: relative;
    overflow: hidden;
  }

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

  /* ── Hero ────────────────────────────────────────────────────────────────── */
  .hero {
    text-align: center;
    margin-bottom: 60px;
    position: relative;
    z-index: 1;
  }
  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.07);
    border: 1px solid rgba(242, 101, 34, 0.18);
    padding: 5px 14px;
    border-radius: 100px;
    margin-bottom: 22px;
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.4rem);
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
    max-width: 460px;
    margin: 0 auto;
    line-height: 1.65;
  }

  /* Trust strip */
  .trust-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 22px;
    flex-wrap: wrap;
    margin-top: 24px;
  }
  .trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .trust-item svg {
    color: var(--teal);
  }

  /* ── Module wrapper ──────────────────────────────────────────────────────── */
  .module-wrap {
    position: relative;
    z-index: 1;
    margin-bottom: 100px;
  }

  /* ── Section heading ─────────────────────────────────────────────────────── */
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

  /* ── FAQ ─────────────────────────────────────────────────────────────────── */
  .faq-list {
    max-width: 600px;
    margin: 0 auto 100px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 1;
  }
  .faq-item {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .faq-item.open {
    border-color: rgba(242, 101, 34, 0.28);
    background: rgba(242, 101, 34, 0.03);
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
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-1);
    text-align: left;
    gap: 12px;
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
    font-size: 0.86rem;
    color: var(--text-3);
    line-height: 1.7;
  }

  /* ── Feature table ───────────────────────────────────────────────────────── */
  .table-wrap {
    max-width: 900px;
    margin: 0 auto;
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 680px;
  }
  thead tr {
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--rim);
  }
  th {
    padding: 13px 16px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    text-align: center;
  }
  th:first-child {
    text-align: left;
    width: 32%;
  }

  /* Section header rows */
  tr.section-row td {
    padding: 9px 16px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.04);
    border-top: 1px solid rgba(242, 101, 34, 0.1);
    border-bottom: 1px solid rgba(242, 101, 34, 0.07);
  }
  tr.feature-row {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.14s;
  }
  tr.feature-row:last-child {
    border-bottom: none;
  }
  tr.feature-row:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  td {
    padding: 12px 16px;
    font-size: 0.84rem;
    color: var(--text-2);
    vertical-align: middle;
    text-align: center;
  }
  td:first-child {
    text-align: left;
    color: var(--text-1);
  }

  /* SVG check / cross */
  .check-svg {
    color: var(--teal);
    display: inline-block;
    vertical-align: middle;
  }
  .cross-svg {
    color: rgba(255, 255, 255, 0.15);
    display: inline-block;
    vertical-align: middle;
  }

  /* String values */
  .feat-str {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-2);
  }
  /* Enterprise column string values get orange */
  td:last-child .feat-str {
    color: var(--orange);
  }
</style>
