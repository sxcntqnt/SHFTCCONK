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
</script>

<div class="plans-wrap {center ? 'centered' : ''}">
  {#each pricingPlans as plan}
    {@const isHighlighted = plan.id === highlightedPlanId}
    {@const isCurrent = plan.id === currentPlanId}

    <div class="plan-card {isHighlighted ? 'highlighted' : ''}">
      {#if isHighlighted}
        <span class="recommended-badge">Recommended</span>
      {/if}

      <div class="plan-name">{plan.name}</div>
      <p class="plan-desc">{plan.description}</p>

      <div class="plan-price-row">
        <span class="plan-price">{plan.price}</span>
        <span class="plan-interval">{plan.priceIntervalName}</span>
      </div>

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
      {:else}
        <a
          href={"/account/subscribe/" + (plan?.stripe_price_id ?? "free_plan")}
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
  .plans-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }
  .plans-wrap.centered {
    justify-content: center;
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

  /* ── Plan name ── */
  .plan-name {
    font-family: var(--font-display, "Syne", sans-serif);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1, #fff);
    margin-bottom: 8px;
  }

  /* ── Description ── */
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

  /* ── CTA button ── */
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

  @media (max-width: 640px) {
    .plan-card {
      max-width: 100%;
    }
  }
</style>
