<script lang="ts">
  import { pricingPlans } from "./pricing_plans"

  interface Props {
    highlightedPlanId?: string
    callToAction?: string
    currentPlanId?: string
    center?: boolean
  }

  let {
    highlightedPlanId = "pro",
    callToAction = "Get Started",
    currentPlanId = "",
    center = true,
  }: Props = $props()

  // ── Billing toggle ────────────────────────────────────────────────────────
  let isAnnual = $state(false)
  const ANNUAL_DISCOUNT = 0.2

  function toggleBilling() {
    isAnnual = !isAnnual
  }

  function getDisplayPrice(plan: (typeof pricingPlans)[number]) {
    if (!plan.stripe_price_id) return plan.price // free / enterprise
    const monthly = parseFloat(plan.price.replace("$", ""))
    const annualTotal = (monthly * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(0)
    return isAnnual ? `$${annualTotal}/yr` : plan.price
  }

  function getDisplayInterval(plan: (typeof pricingPlans)[number]) {
    if (!plan.stripe_price_id) return plan.priceIntervalName
    return isAnnual ? "billed annually" : plan.priceIntervalName
  }

  function ctaHref(plan: (typeof pricingPlans)[number]) {
    if (!plan.stripe_price_id) return null
    return `/account/subscribe/${plan.stripe_price_id}`
  }
</script>

<!-- Billing toggle -->
<div class="billing-row">
  <span
    class="toggle-label {!isAnnual ? 'active' : ''}"
    onclick={toggleBilling}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === "Enter" && toggleBilling()}>Monthly</span
  >

  <div
    class="toggle-track {isAnnual ? 'on' : ''}"
    onclick={toggleBilling}
    role="switch"
    aria-checked={isAnnual}
    tabindex="0"
    onkeydown={(e) => e.key === "Enter" && toggleBilling()}
  >
    <div class="toggle-knob"></div>
  </div>

  <span
    class="toggle-label {isAnnual ? 'active' : ''}"
    onclick={toggleBilling}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === "Enter" && toggleBilling()}>Annual</span
  >

  {#if isAnnual}
    <span class="save-chip">Save 20%</span>
  {/if}
</div>

<!-- Plan cards -->
<div class="plans-wrap {center ? 'centered' : ''}">
  {#each pricingPlans as plan}
    {@const isHighlighted = plan.id === highlightedPlanId}
    {@const isCurrent = plan.id === currentPlanId}
    {@const href = ctaHref(plan)}

    <div class="plan-card {isHighlighted ? 'highlighted' : ''}">
      {#if isHighlighted}
        <span class="recommended-badge">Recommended</span>
      {/if}

      <div class="plan-name">{plan.name}</div>
      <p class="plan-desc">{plan.description}</p>

      <div class="plan-price-row">
        <span class="plan-price">{getDisplayPrice(plan)}</span>
      </div>
      <span class="plan-interval">{getDisplayInterval(plan)}</span>

      {#if plan.note}
        <div class="plan-note">{plan.note}</div>
      {/if}

      <div class="plan-divider"></div>

      <div class="features-label">Plan includes</div>
      <ul class="features-list">
        {#each plan.features as feature}
          <li class="feature-item">
            <svg
              class="feature-check"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feature}
          </li>
        {/each}
      </ul>

      {#if isCurrent}
        <div class="cta-btn current">Current Plan</div>
      {:else if !href}
        <a href="mailto:sales@matatupulse.com" class="cta-btn contact">
          Contact Sales
        </a>
      {:else}
        <a {href} class="cta-btn {isHighlighted ? 'prominent' : 'default'}">
          {callToAction}
        </a>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* ── Billing toggle ─────────────────────────────────────────────────────── */
  .billing-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    width: 100%;
    margin-bottom: 36px;
  }

  .toggle-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-3);
    transition: color 0.15s;
    cursor: pointer;
    user-select: none;
  }
  .toggle-label.active {
    color: var(--text-1);
  }

  .toggle-track {
    width: 44px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .toggle-track.on {
    background: var(--teal);
    border-color: var(--teal);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .toggle-track.on .toggle-knob {
    transform: translateX(20px);
  }

  .save-chip {
    padding: 3px 9px;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.25);
    border-radius: 100px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--teal);
    animation: pop-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ── Plans row ──────────────────────────────────────────────────────────── */
  .plans-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }
  .plans-wrap.centered {
    justify-content: center;
  }

  /* ── Plan card ──────────────────────────────────────────────────────────── */
  .plan-card {
    flex: 1 1 240px;
    max-width: 300px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    padding: 26px 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.22s,
      box-shadow 0.22s,
      transform 0.2s;
  }
  .plan-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.07),
      transparent
    );
  }
  .plan-card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  }

  /* Highlighted */
  .plan-card.highlighted {
    border-color: rgba(242, 101, 34, 0.4);
    background: linear-gradient(
      160deg,
      rgba(242, 101, 34, 0.07) 0%,
      rgba(15, 15, 22, 0.98) 55%
    );
    box-shadow:
      0 0 0 1px rgba(242, 101, 34, 0.12),
      0 16px 48px rgba(0, 0, 0, 0.45);
  }
  .plan-card.highlighted::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.55),
      transparent
    );
  }
  .plan-card.highlighted:hover {
    border-color: rgba(242, 101, 34, 0.6);
    transform: translateY(-3px);
    box-shadow:
      0 0 0 1px rgba(242, 101, 34, 0.22),
      0 22px 56px rgba(0, 0, 0, 0.5);
  }

  /* ── Recommended badge ─────────────────────────────────────────────────── */
  .recommended-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 0.56rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.28);
    padding: 3px 9px;
    border-radius: 100px;
  }

  /* ── Plan name / desc ──────────────────────────────────────────────────── */
  .plan-name {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin-bottom: 7px;
  }
  .plan-desc {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.6;
    margin-bottom: 18px;
  }

  /* ── Price ─────────────────────────────────────────────────────────────── */
  .plan-price-row {
    display: flex;
    align-items: baseline;
    gap: 5px;
    margin-bottom: 4px;
  }
  .plan-price {
    font-family: var(--font-display);
    font-size: 2.3rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text-1);
  }
  .plan-interval {
    font-size: 0.73rem;
    color: var(--text-3);
    font-weight: 500;
    line-height: 1.3;
  }

  /* ── Note ──────────────────────────────────────────────────────────────── */
  .plan-note {
    margin-top: 8px;
    margin-bottom: 16px;
    padding: 7px 11px;
    background: rgba(242, 101, 34, 0.07);
    border: 1px solid rgba(242, 101, 34, 0.15);
    border-radius: 9px;
    font-size: 0.72rem;
    color: var(--orange);
    line-height: 1.5;
  }

  /* ── Divider ───────────────────────────────────────────────────────────── */
  .plan-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
    margin: 16px 0;
  }

  /* ── Features ──────────────────────────────────────────────────────────── */
  .features-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }
  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    margin-bottom: 24px;
  }
  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.45;
  }
  .feature-check {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--teal);
  }
  .plan-card.highlighted .feature-check {
    color: var(--orange);
  }

  /* ── CTA ───────────────────────────────────────────────────────────────── */
  .cta-btn {
    display: block;
    width: 100%;
    padding: 11px 16px;
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition:
      background 0.16s,
      box-shadow 0.16s,
      transform 0.13s;
    box-sizing: border-box;
  }
  .cta-btn.default {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-1);
  }
  .cta-btn.default:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  .cta-btn.prominent {
    background: var(--orange);
    color: #fff;
    box-shadow: 0 4px 18px rgba(242, 101, 34, 0.32);
  }
  .cta-btn.prominent:hover {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.45);
    transform: translateY(-1px);
  }
  .cta-btn.current {
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.22);
    color: var(--teal);
    cursor: default;
    pointer-events: none;
  }
  .cta-btn.contact {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    color: var(--text-3);
  }
  .cta-btn.contact:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .plans-wrap {
      flex-direction: column;
      align-items: center;
    }
    .plan-card {
      max-width: 480px;
      width: 100%;
    }
  }
  @media (max-width: 640px) {
    .plan-card {
      max-width: 100%;
    }
  }
</style>
