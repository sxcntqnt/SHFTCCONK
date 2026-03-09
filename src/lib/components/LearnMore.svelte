<!-- src/components/LearnMore.svelte -->
<script>
  import {
    Info,
    Zap,
    Heart,
    MapPin,
    Star,
    Route,
    Shield,
    ChevronRight,
    X,
  } from "@lucide/svelte"
  let showInfo = $state(false)
  let hasOpened = $state(false)

  function toggle() {
    showInfo = !showInfo
    if (showInfo) hasOpened = true
  }
</script>

<div class="lm-root">
  <!-- Trigger button -->
  <button
    onclick={toggle}
    class="lm-trigger"
    class:lm-trigger-active={showInfo}
  >
    <span class="lm-trigger-glow"></span>
    <span class="lm-trigger-content">
      {#if showInfo}
        <X size={18} strokeWidth={2.5} />
        <span>Close</span>
      {:else}
        <span class="lm-trigger-icon-wrap">
          <Info size={18} strokeWidth={2.5} />
          <span class="lm-trigger-ping"></span>
        </span>
        <span>What is this?</span>
        <ChevronRight size={14} strokeWidth={2.5} class="lm-chevron" />
      {/if}
    </span>
  </button>

  <!-- Expandable panel -->
  {#if showInfo}
    <div class="lm-panel">
      <!-- Decorative background elements -->
      <div class="lm-panel-bg">
        <div class="lm-bg-orb lm-bg-orb-1"></div>
        <div class="lm-bg-orb lm-bg-orb-2"></div>
        <div class="lm-bg-orb lm-bg-orb-3"></div>
        <div class="lm-bg-grid"></div>
      </div>

      <div class="lm-panel-inner">
        <!-- Hero section -->
        <div class="lm-hero" style="animation-delay: 0ms">
          <div class="lm-hero-badge">
            <Zap size={14} strokeWidth={2.5} />
            <span>Your Ride, Your Rules</span>
          </div>
          <h2 class="lm-hero-title">
            <span class="lm-title-line">Welcome to the</span>
            <span class="lm-title-line lm-title-accent">Command Center</span>
          </h2>
          <p class="lm-hero-body">
            This isn't just a dashboard — it's your daily co-pilot for
            navigating the city. Built for the rhythm of Nairobi streets, tuned
            for the people who keep the wheels turning.
          </p>
        </div>

        <!-- Feature cards -->
        <div class="lm-features">
          <div class="lm-feature" style="animation-delay: 80ms">
            <div class="lm-feature-icon lm-fi-green">
              <Heart size={18} strokeWidth={2} />
            </div>
            <div class="lm-feature-text">
              <h3>Favorite Everything</h3>
              <p>
                Lock in your go-to drivers, matatus, and routes. One tap —
                they're pinned for life. No more searching the same thing twice.
              </p>
            </div>
          </div>

          <div class="lm-feature" style="animation-delay: 160ms">
            <div class="lm-feature-icon lm-fi-blue">
              <MapPin size={18} strokeWidth={2} />
            </div>
            <div class="lm-feature-text">
              <h3>Route Memory</h3>
              <p>
                Your frequent routes learn you back. The system remembers where
                you've been so getting there again is instant. Morning commute?
                Already loaded.
              </p>
            </div>
          </div>

          <div class="lm-feature" style="animation-delay: 240ms">
            <div class="lm-feature-icon lm-fi-amber">
              <Star size={18} strokeWidth={2} />
            </div>
            <div class="lm-feature-text">
              <h3>Tip Your Crew</h3>
              <p>
                Great driver? Conductor who made your day? Send a tip directly.
                Small gestures, big impact — and they'll remember you too.
              </p>
            </div>
          </div>

          <div class="lm-feature" style="animation-delay: 320ms">
            <div class="lm-feature-icon lm-fi-rose">
              <Route size={18} strokeWidth={2} />
            </div>
            <div class="lm-feature-text">
              <h3>Live Pulse</h3>
              <p>
                Real-time everything. Where your matatu is, how full it is, ETAs
                that actually mean something. No more guesswork at the stage.
              </p>
            </div>
          </div>

          <div class="lm-feature" style="animation-delay: 400ms">
            <div class="lm-feature-icon lm-fi-teal">
              <Shield size={18} strokeWidth={2} />
            </div>
            <div class="lm-feature-text">
              <h3>Built on Trust</h3>
              <p>
                Every actor is verified. Every transaction is tracked. The
                transparency layer that matatu culture has been waiting for.
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom signature -->
        <div class="lm-footer" style="animation-delay: 480ms">
          <div class="lm-footer-line"></div>
          <p class="lm-footer-text">
            Powered by reactive Svelte stores, Supabase row-level security, and
            an unhealthy obsession with making transit beautiful.
            <span class="lm-footer-emoji">🚐</span>
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Root ── */
  .lm-root {
    --lm-green: #34d399;
    --lm-blue: #60a5fa;
    --lm-amber: #fbbf24;
    --lm-rose: #fb7185;
    --lm-teal: #2dd4bf;
    --lm-surface: rgba(255, 255, 255, 0.025);
    --lm-border: rgba(255, 255, 255, 0.06);
    font-family:
      "DM Sans",
      system-ui,
      -apple-system,
      sans-serif;
    position: relative;
  }

  /* ── Trigger button ── */
  .lm-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1.25rem;
    border-radius: 14px;
    border: 1px solid var(--lm-border);
    background: var(--lm-surface);
    color: #c8cbd3;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .lm-trigger:hover {
    border-color: rgba(99, 132, 255, 0.2);
    background: rgba(99, 132, 255, 0.04);
    color: #e2e4e9;
  }

  .lm-trigger-active {
    border-color: rgba(99, 132, 255, 0.15);
    background: rgba(99, 132, 255, 0.06);
  }

  .lm-trigger-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99, 132, 255, 0.04),
      transparent
    );
    transform: translateX(-100%);
    animation: lm-shimmer 3s ease-in-out infinite;
  }

  .lm-trigger:hover .lm-trigger-glow {
    animation-duration: 1.5s;
  }

  @keyframes lm-shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .lm-trigger-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 1;
  }

  .lm-trigger-icon-wrap {
    position: relative;
    display: flex;
  }

  .lm-trigger-ping {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--lm-green);
    animation: lm-ping 2s ease-in-out infinite;
  }

  @keyframes lm-ping {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  :global(.lm-chevron) {
    margin-left: auto;
    opacity: 0.4;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
  }

  .lm-trigger:hover :global(.lm-chevron) {
    transform: translateX(3px);
    opacity: 0.7;
  }

  /* ── Panel ── */
  .lm-panel {
    position: relative;
    margin-top: 0.75rem;
    border-radius: 20px;
    border: 1px solid var(--lm-border);
    background: #0d0f14;
    overflow: hidden;
    animation: lm-panel-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes lm-panel-in {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
      clip-path: inset(0 0 100% 0 round 20px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      clip-path: inset(0 0 0% 0 round 20px);
    }
  }

  /* ── Panel background effects ── */
  .lm-panel-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .lm-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
  }

  .lm-bg-orb-1 {
    top: -30%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: rgba(99, 132, 255, 0.08);
    animation: lm-orb-drift 12s ease-in-out infinite alternate;
  }

  .lm-bg-orb-2 {
    bottom: -20%;
    left: -5%;
    width: 250px;
    height: 250px;
    background: rgba(45, 212, 191, 0.06);
    animation: lm-orb-drift 15s ease-in-out infinite alternate-reverse;
  }

  .lm-bg-orb-3 {
    top: 40%;
    right: 20%;
    width: 180px;
    height: 180px;
    background: rgba(251, 191, 36, 0.04);
    animation: lm-orb-drift 10s ease-in-out infinite alternate;
  }

  @keyframes lm-orb-drift {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(20px, -15px);
    }
  }

  .lm-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  }

  .lm-panel-inner {
    position: relative;
    z-index: 1;
    padding: 2rem 1.75rem 1.5rem;
  }

  /* ── Hero ── */
  .lm-hero {
    margin-bottom: 1.75rem;
    animation: lm-fade-up 0.5s ease-out both;
  }

  @keyframes lm-fade-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lm-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--lm-green);
    background: rgba(52, 211, 153, 0.08);
    border: 1px solid rgba(52, 211, 153, 0.12);
    padding: 0.3rem 0.7rem;
    border-radius: 100px;
    margin-bottom: 1rem;
  }

  .lm-hero-title {
    font-size: 1.65rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.03em;
    margin: 0 0 0.85rem;
    color: #f0f1f4;
  }

  .lm-title-line {
    display: block;
  }

  .lm-title-accent {
    background: linear-gradient(135deg, #6384ff 0%, #2dd4bf 50%, #fbbf24 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lm-hero-body {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #8b8fa3;
    margin: 0;
    max-width: 520px;
  }

  /* ── Features ── */
  .lm-features {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .lm-feature {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid transparent;
    transition: all 0.2s ease;
    animation: lm-fade-up 0.45s ease-out both;
    cursor: default;
  }

  .lm-feature:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--lm-border);
    transform: translateX(4px);
  }

  .lm-feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .lm-fi-green {
    background: rgba(52, 211, 153, 0.1);
    color: var(--lm-green);
  }
  .lm-fi-blue {
    background: rgba(96, 165, 250, 0.1);
    color: var(--lm-blue);
  }
  .lm-fi-amber {
    background: rgba(251, 191, 36, 0.1);
    color: var(--lm-amber);
  }
  .lm-fi-rose {
    background: rgba(251, 113, 133, 0.1);
    color: var(--lm-rose);
  }
  .lm-fi-teal {
    background: rgba(45, 212, 191, 0.1);
    color: var(--lm-teal);
  }

  .lm-feature-text h3 {
    font-size: 0.88rem;
    font-weight: 600;
    color: #e2e4e9;
    margin: 0 0 0.2rem;
    line-height: 1.2;
  }

  .lm-feature-text p {
    font-size: 0.8rem;
    line-height: 1.55;
    color: #6b7084;
    margin: 0;
  }

  /* ── Footer ── */
  .lm-footer {
    animation: lm-fade-up 0.45s ease-out both;
  }

  .lm-footer-line {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06) 20%,
      rgba(255, 255, 255, 0.06) 80%,
      transparent
    );
    margin-bottom: 1rem;
  }

  .lm-footer-text {
    font-size: 0.75rem;
    line-height: 1.6;
    color: #44475a;
    margin: 0;
    font-style: italic;
  }

  .lm-footer-emoji {
    display: inline-block;
    font-style: normal;
    animation: lm-bounce 2s ease-in-out infinite;
  }

  @keyframes lm-bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .lm-panel-inner {
      padding: 1.5rem 1.15rem 1.25rem;
    }

    .lm-hero-title {
      font-size: 1.35rem;
    }

    .lm-feature {
      padding: 0.7rem 0.75rem;
      gap: 0.7rem;
    }

    .lm-feature-icon {
      width: 32px;
      height: 32px;
    }
  }
</style>
