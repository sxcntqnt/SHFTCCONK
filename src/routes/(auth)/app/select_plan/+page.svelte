<!-- src/routes/(auth)/app/select_plan/+page.svelte -->
<script lang="ts">
  import { goto } from "$app/navigation"

  // ── Plan definitions ───────────────────────────────────────────────────────
  interface Plan {
    id: string
    name: string
    price: number | null // null = custom
    period: string
    badge?: string
    highlight: boolean
    description: string
    features: string[]
    cta: string
    href: string
  }

  const plans: Plan[] = [
    {
      id: "free",
      name: "Starter",
      price: 0,
      period: "forever",
      highlight: false,
      description: "Everything you need to get on the road.",
      features: [
        "Live tracking (1 vehicle)",
        "Basic incident reporting",
        "Tip Jar access",
        "Passenger seat reservations",
        "Community support",
      ],
      cta: "Start Free",
      href: "/app/dashboard",
    },
    {
      id: "pro",
      name: "Pro",
      price: 1_499,
      period: "per month",
      badge: "Most Popular",
      highlight: true,
      description: "For active crew and small fleet operators.",
      features: [
        "Everything in Starter",
        "Live tracking (up to 10 vehicles)",
        "Advanced analytics & insights",
        "Priority incident routing",
        "Bulk reservations management",
        "Dedicated support",
      ],
      cta: "Start Pro",
      href: "/app/dashboard",
    },
    {
      id: "enterprise",
      name: "Fleet",
      price: null,
      period: "custom pricing",
      highlight: false,
      description: "Built for SACCOs and large fleet operators.",
      features: [
        "Everything in Pro",
        "Unlimited vehicles",
        "Custom roles & permissions",
        "Multi-branch management",
        "Compliance & reconciliation suite",
        "SLA & dedicated account manager",
      ],
      cta: "Contact Sales",
      href: "/contact",
    },
  ]

  let selecting = $state<string | null>(null)

  async function selectPlan(plan: Plan) {
    selecting = plan.id
    // TODO: call your Stripe/billing action here before redirecting
    // e.g. await fetch("/app/api/billing", { method: "POST", body: ... })
    await new Promise((r) => setTimeout(r, 600)) // simulate async
    goto(plan.href)
  }
</script>

<svelte:head>
  <title>Select a Plan — Matatu Pulse</title>
</svelte:head>

<div class="page">
  <!-- Atmospheric blobs -->
  <div class="blob blob-orange" aria-hidden="true"></div>
  <div class="blob blob-teal" aria-hidden="true"></div>

  <!-- Header -->
  <div class="header">
    <div class="eyebrow">
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
    <h1 class="title">
      Unlock the full<br /><em>Matatu Pulse</em>
    </h1>
    <p class="sub">
      Start free, upgrade when you're ready. No credit card required.
    </p>
  </div>

  <!-- Plan cards -->
  <div class="cards">
    {#each plans as plan}
      <div class="card {plan.highlight ? 'highlighted' : ''}">
        {#if plan.highlight}
          <div class="card-glow" aria-hidden="true"></div>
        {/if}

        {#if plan.badge}
          <div class="badge">{plan.badge}</div>
        {/if}

        <div class="card-top">
          <div class="plan-name">{plan.name}</div>
          <div class="plan-price">
            {#if plan.price === null}
              <span class="price-custom">Custom</span>
            {:else if plan.price === 0}
              <span class="price-free">Free</span>
            {:else}
              <span class="price-cur">KES</span>
              <span class="price-val">{plan.price.toLocaleString()}</span>
            {/if}
          </div>
          <div class="price-period">{plan.period}</div>
          <p class="plan-desc">{plan.description}</p>
        </div>

        <ul class="features">
          {#each plan.features as feat}
            <li class="feat">
              <span class="feat-check">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              {feat}
            </li>
          {/each}
        </ul>

        <button
          class="cta {plan.highlight ? 'cta-primary' : 'cta-ghost'}"
          disabled={selecting !== null}
          onclick={() => selectPlan(plan)}
        >
          {#if selecting === plan.id}
            <span class="spinner"></span>Setting up…
          {:else}
            {plan.cta}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          {/if}
        </button>
      </div>
    {/each}
  </div>

  <!-- Trust strip -->
  <div class="trust">
    <div class="trust-item">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      No credit card to start
    </div>
    <span class="trust-dot" aria-hidden="true"></span>
    <div class="trust-item">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Cancel anytime
    </div>
    <span class="trust-dot" aria-hidden="true"></span>
    <div class="trust-item">
      <svg
        width="12"
        height="12"
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

  <!-- Skip link -->
  <a href="/app/dashboard" class="skip-link">
    Skip for now → go to dashboard
  </a>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 24px 80px;
    font-family: var(--font-body);
    position: relative;
    overflow: hidden;
  }

  /* ── Atmospheric blobs ── */
  .blob {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }
  .blob-orange {
    width: 560px;
    height: 560px;
    top: -160px;
    right: -160px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.08),
      transparent 65%
    );
  }
  .blob-teal {
    width: 460px;
    height: 460px;
    bottom: -120px;
    left: -120px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.07),
      transparent 65%
    );
  }

  /* ── Header ── */
  .header {
    text-align: center;
    margin-bottom: 52px;
    max-width: 520px;
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.18);
    padding: 5px 13px;
    border-radius: 100px;
    margin-bottom: 20px;
  }
  .title {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1.05;
    color: var(--text-1);
    margin-bottom: 14px;
  }
  .title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff9a5c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sub {
    font-size: 0.88rem;
    color: var(--text-3);
    line-height: 1.65;
  }

  /* ── Plan cards ── */
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    width: 100%;
    max-width: 960px;
    position: relative;
    z-index: 1;
  }

  .card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 28px 26px;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }
  .card:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.14);
  }

  /* Highlighted (Pro) card */
  .card.highlighted {
    border-color: rgba(0, 176, 155, 0.35);
    background: rgba(0, 176, 155, 0.05);
  }
  .card.highlighted:hover {
    border-color: rgba(0, 176, 155, 0.55);
  }
  .card-glow {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    height: 180px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.14),
      transparent 70%
    );
    pointer-events: none;
  }

  .badge {
    position: absolute;
    top: 18px;
    right: 18px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.25);
    padding: 3px 9px;
    border-radius: 100px;
  }

  .card-top {
    margin-bottom: 20px;
  }

  .plan-name {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 3px;
    margin-bottom: 3px;
  }
  .price-cur {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-2);
    align-self: flex-start;
    margin-top: 6px;
  }
  .price-val {
    font-family: var(--font-display);
    font-size: 2.8rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text-1);
  }
  .price-free {
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
  }
  .price-custom {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
  }
  .price-period {
    font-size: 0.68rem;
    color: var(--text-3);
    margin-bottom: 12px;
  }
  .plan-desc {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.55;
  }

  /* ── Features list ── */
  .features {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex: 1;
  }
  .feat {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.4;
  }
  .feat-check {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--teal);
  }

  /* ── CTAs ── */
  .cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
    padding: 11px;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cta:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .cta-primary {
    background: var(--teal);
    border: none;
    color: #fff;
    box-shadow: 0 4px 18px rgba(0, 176, 155, 0.3);
  }
  .cta-primary:hover:not(:disabled) {
    background: #009a88;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 176, 155, 0.38);
  }

  .cta-ghost {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-2);
  }
  .cta-ghost:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
    color: var(--text-1);
  }

  /* ── Spinner ── */
  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Trust strip ── */
  .trust {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 44px;
    flex-wrap: wrap;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .trust-item svg {
    color: var(--teal);
    flex-shrink: 0;
  }
  .trust-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--rim-2);
    flex-shrink: 0;
  }

  /* ── Skip link ── */
  .skip-link {
    margin-top: 24px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    opacity: 0.6;
    transition: opacity 0.15s;
    position: relative;
    z-index: 1;
  }
  .skip-link:hover {
    opacity: 1;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .cards {
      grid-template-columns: 1fr;
      max-width: 420px;
    }
    .trust-dot {
      display: none;
    }
    .trust {
      flex-direction: column;
      gap: 10px;
    }
  }
  @media (max-width: 480px) {
    .page {
      padding: 40px 16px 60px;
    }
  }
</style>
