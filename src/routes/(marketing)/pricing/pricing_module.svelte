<script lang="ts">
  import { pricingPlans } from "./pricing_plans"

  interface Props {
    highlightedPlanId?: string
    callToAction: string
    currentPlanId?: string
    center?: boolean
  }
  let {
    highlightedPlanId = "",
    callToAction,
    currentPlanId = "",
    center = true,
  }: Props = $props()

  // Simple toggle state - NO complex mapping
  let isAnnual = $state(false)
  const ANNUAL_DISCOUNT = 0.2

  function toggleBilling() {
    isAnnual = !isAnnual
  }

  // Helper to get display price for any plan
  function getDisplayPrice(plan: any) {
    if (plan.id === "free") return plan.price

    const monthlyPrice = parseFloat(plan.price.replace("$", ""))
    const annualPrice = (monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(0)

    return isAnnual ? `$${annualPrice}/yr` : plan.price
  }

  // Helper to get display interval
  function getDisplayInterval(plan: any) {
    if (plan.id === "free") return plan.priceIntervalName

    return isAnnual ? "billed annually" : plan.priceIntervalName
  }
</script>

<div class="plans-wrap {center ? 'centered' : ''}">
  <!-- Annual Toggle -->
  <div class="billing-toggle">
    <div class="toggle-labels">
      <span class={isAnnual ? "inactive" : "active"}>Monthly</span>
      <div class="toggle-switch" onclick={toggleBilling}>
        <div class="toggle-slider" class:annual={isAnnual}></div>
      </div>
      <span class={isAnnual ? "active" : "inactive"}>Annual</span>
    </div>
    {#if isAnnual}
      <div class="savings-badge">Save 20%</div>
    {/if}
  </div>

  {#each pricingPlans as plan}
    <!-- ✅ Back to original array -->
    {@const isHighlighted = plan.id === highlightedPlanId}
    {@const isCurrent = plan.id === currentPlanId}

    <div class="plan-card {isHighlighted ? 'highlighted' : ''}">
      {#if isHighlighted && plan.id !== "free"}
        <span class="recommended-badge">Recommended</span>
      {/if}

      <div class="plan-name">{plan.name}</div>
      <p class="plan-desc">{plan.description}</p>

      <div class="plan-price-row">
        <span class="plan-price">{getDisplayPrice(plan)}</span>
        <span class="plan-interval">{getDisplayInterval(plan)}</span>
      </div>

      {#if plan.note}
        <div class="plan-note">{plan.note}</div>
      {/if}

      <div class="plan-divider"></div>

      <div class="features-label">What's included</div>
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
      {:else if !plan.stripe_price_id}
        <div class="cta-btn contact">Contact Sales</div>
      {:else}
        <a
          href={`/account/subscribe/${plan.stripe_price_id}`}
          class="cta-btn {isHighlighted ? 'prominent' : 'default'}"
        >
          {callToAction}
        </a>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* ── Plans row ── */
  :global(.plans-wrap) {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center; /* from first snippet */
    position: relative; /* from first snippet */
  }
  .plans-wrap.centered {
    justify-content: center;
  }

  /* ── Billing Toggle ── */
  .billing-toggle {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    width: 100%;
  }

  .toggle-labels {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--color-surface-2, rgba(255, 255, 255, 0.05));
    padding: 0.5rem 1rem;
    border-radius: 50px;
    position: relative;
  }

  .toggle-labels span {
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 2;
    position: relative;
  }

  .toggle-labels span.active {
    color: var(--orange, #f26522);
    background: rgba(242, 101, 34, 0.1);
  }

  .toggle-labels span.inactive {
    color: var(--text-3, rgba(255, 255, 255, 0.4));
  }

  .toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .toggle-switch:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .toggle-slider.annual {
    transform: translateX(20px);
  }

  .toggle-switch:has(.toggle-slider.annual) {
    background: var(--teal, #00b09b);
  }

  .savings-badge {
    background: var(--teal, #00b09b);
    color: #fff;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* ── Plan card ── */
  .plan-card {
    flex: 1 1 260px;
    max-width: 310px;
    background: var(--surface, #13131e);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    padding: 28px 26px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.25s,
      box-shadow 0.25s,
      transform 0.2s;
  }

  .plan-card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }

  /* Highlighted / recommended card */
  .plan-card.highlighted {
    border-color: rgba(242, 101, 34, 0.4);
    box-shadow:
      0 0 0 1px rgba(242, 101, 34, 0.15),
      0 16px 48px rgba(0, 0, 0, 0.4);
    background: linear-gradient(
      160deg,
      rgba(242, 101, 34, 0.06) 0%,
      #13131e 60%
    );
  }

  .plan-card.highlighted:hover {
    border-color: rgba(242, 101, 34, 0.6);
    transform: translateY(-3px);
    box-shadow:
      0 0 0 1px rgba(242, 101, 34, 0.2),
      0 20px 60px rgba(0, 0, 0, 0.4);
  }

  /* Top accent line */
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
      rgba(255, 255, 255, 0.08),
      transparent
    );
  }

  .plan-card.highlighted::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.55),
      transparent
    );
  }

  /* ── Recommended badge ── */
  .recommended-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange, #f26522);
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.25);
    padding: 3px 9px;
    border-radius: 100px;
  }

  /* ── Plan name / description ── */
  .plan-name {
    font-family: var(--font-display, "Syne", sans-serif);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1, #fff);
    margin-bottom: 8px;
  }

  .plan-desc {
    font-size: 0.82rem;
    color: var(--text-3, rgba(255, 255, 255, 0.4));
    line-height: 1.6;
    margin-bottom: 20px;
  }

  /* ── Price ── */
  .plan-price-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 20px;
  }

  .plan-price {
    font-family: var(--font-display, "Syne", sans-serif);
    font-size: 2.4rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text-1, #fff);
  }

  .plan-interval {
    font-size: 0.78rem;
    color: var(--text-3, rgba(255, 255, 255, 0.4));
    font-weight: 500;
  }

  /* ── Plan note ── */
  .plan-note {
    background: rgba(242, 101, 34, 0.1);
    color: var(--orange, #f26522);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  /* ── Features list ── */
  .features-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3, rgba(255, 255, 255, 0.4));
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
    margin-bottom: 28px;
  }

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 0.82rem;
    color: var(--text-2, rgba(255, 255, 255, 0.65));
    line-height: 1.45;
  }

  .feature-check {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--teal, #00b09b);
  }

  .plan-card.highlighted .feature-check {
    color: var(--orange, #f26522);
  }

  /* ── Divider ── */
  .plan-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
    margin-bottom: 20px;
  }

  /* ── CTA buttons ── */
  .cta-btn {
    display: block;
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    font-family: var(--font-body, "DM Sans", sans-serif);
    font-size: 0.875rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.15s,
      opacity 0.15s;
  }

  /* Default CTA — outlined */
  .cta-btn.default {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-1, #fff);
  }

  .cta-btn.default:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
  }

  /* Highlighted CTA — orange fill */
  .cta-btn.prominent {
    background: var(--orange, #f26522);
    color: #fff;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.3);
  }

  .cta-btn.prominent:hover {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.42);
    transform: translateY(-1px);
  }

  /* Current plan state */
  .cta-btn.current {
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    color: var(--teal, #00b09b);
    cursor: default;
    pointer-events: none;
  }

  /* Contact CTA */
  .cta-btn.contact {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-3, rgba(255, 255, 255, 0.4));
    cursor: default;
    pointer-events: none;
  }

  /* ── Media queries ── */
  @media (max-width: 768px) {
    :global(.plans-wrap) {
      flex-direction: column;
      gap: 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .plan-card {
      max-width: 100%;
    }
  }
</style>
