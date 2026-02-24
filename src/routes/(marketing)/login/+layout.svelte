<script lang="ts">
  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  let isEurope = $state(false)
  try {
    isEurope = Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone.startsWith("Europe/")
  } catch (e) { /* continue */ }
</script>

<style>
  /* ═══════════════════════════════════════════════
     ROOT
  ═══════════════════════════════════════════════ */
  .login-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    background: #0c0c12;
    position: relative;
    overflow: hidden;
  }

  /* ═══════════════════════════════════════════════
     BRAND PANEL — LEFT
  ═══════════════════════════════════════════════ */
  .brand-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px 52px;
    overflow: hidden;
    isolation: isolate;

    /* Rich dark base — not flat black, slightly warm */
    background: #0f0f16;
  }

  /* ── Layer 1: large sweep gradient — orange warmth bottom-left ── */
  .brand-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 90% 70% at -10% 110%, rgba(242,101,34,0.22) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 110% -10%, rgba(0,176,155,0.08) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(242,101,34,0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Layer 2: fine dot grid ── */
  .brand-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
    background-size: 24px 24px;
    /* Fade out in a diagonal — top-right sharp, bottom-left invisible */
    mask-image: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, transparent 80%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Layer 3: vertical separator — gradient edge, not a flat line ── */
  .brand-separator {
    position: absolute;
    top: 0; right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(242,101,34,0.3) 20%,
      rgba(255,255,255,0.08) 50%,
      rgba(242,101,34,0.15) 80%,
      transparent 100%
    );
    z-index: 2;
  }

  /* ── Floating orbs — depth illusion ── */
  .orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(60px);
    animation: orb-drift 12s ease-in-out infinite;
  }
  .orb-1 {
    width: 320px; height: 320px;
    background: rgba(242,101,34,0.14);
    bottom: -60px; left: -80px;
    animation-delay: 0s;
  }
  .orb-2 {
    width: 180px; height: 180px;
    background: rgba(0,176,155,0.10);
    top: 80px; right: -40px;
    animation-delay: -5s;
    animation-duration: 15s;
  }
  .orb-3 {
    width: 120px; height: 120px;
    background: rgba(242,101,34,0.08);
    top: 45%; left: 55%;
    animation-delay: -8s;
    animation-duration: 18s;
  }

  @keyframes orb-drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(20px, -30px) scale(1.05); }
    66%       { transform: translate(-15px, 15px) scale(0.97); }
  }

  /* ═══════════════════════════════════════════════
     BRAND CONTENT
  ═══════════════════════════════════════════════ */
  .brand-top {
    position: relative;
    z-index: 1;
  }

  /* Logo */
  .logo-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    margin-bottom: 72px;
  }
  .logo-mark {
    width: 38px; height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, #f26522, #c94f18);
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 0 0 1px rgba(242,101,34,0.4),
      0 4px 16px rgba(242,101,34,0.35),
      inset 0 1px 0 rgba(255,255,255,0.15);
    flex-shrink: 0;
  }
  .logo-wordmark {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: rgba(255,255,255,0.92);
  }
  .logo-wordmark span { color: #f26522; }

  /* Headline */
  .brand-headline {
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 2.6vw, 2.55rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
    margin-bottom: 18px;

    /* Gradient text — white fading to warm off-white */
    background: linear-gradient(
      160deg,
      #ffffff 0%,
      rgba(255,255,255,0.75) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .brand-headline em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .brand-sub {
    font-size: 0.92rem;
    color: rgba(255,255,255,0.42);
    line-height: 1.75;
    max-width: 340px;
    margin-bottom: 52px;
  }

  /* ── Stat cards ── */
  .brand-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .brand-stat {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(8px);
    transition: background 0.25s, border-color 0.25s, transform 0.25s;
  }
  .brand-stat:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(242,101,34,0.22);
    transform: translateX(4px);
  }

  .stat-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    position: relative;
  }
  .stat-icon::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(242,101,34,0.2), rgba(242,101,34,0.06));
    border: 1px solid rgba(242,101,34,0.25);
  }
  .stat-icon svg {
    position: relative; z-index: 1;
    color: #f26522;
  }

  .stat-label {
    flex: 1;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.45);
    line-height: 1.3;
  }
  .stat-label strong {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: rgba(255,255,255,0.92);
    display: block;
    margin-bottom: 1px;
  }

  /* ── Testimonial ── */
  .brand-bottom {
    position: relative;
    z-index: 1;
  }

  .brand-testimonial {
    position: relative;
    border-radius: 18px;
    padding: 24px 26px;
    overflow: hidden;

    /* Glass morphism */
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  /* Orange accent line along top of card */
  .brand-testimonial::before {
    content: '';
    position: absolute;
    top: 0; left: 24px; right: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(242,101,34,0.6), transparent);
  }

  /* Subtle inner glow */
  .brand-testimonial::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 200px; height: 100px;
    background: radial-gradient(ellipse at 0% 0%, rgba(242,101,34,0.07), transparent 70%);
    pointer-events: none;
  }

  /* Quote mark */
  .testi-quote-mark {
    font-family: Georgia, serif;
    font-size: 3rem;
    line-height: 1;
    color: rgba(242,101,34,0.35);
    margin-bottom: -4px;
    display: block;
    height: 28px;
    overflow: hidden;
  }

  .testi-stars {
    display: flex;
    gap: 3px;
    margin-bottom: 10px;
  }
  .star {
    font-size: 0.7rem;
    background: linear-gradient(90deg, #f26522, #ff9a5c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .testi-quote {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.82);
    line-height: 1.7;
    font-style: italic;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .testi-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .testi-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f26522 0%, #c94f18 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(242,101,34,0.3), 0 2px 8px rgba(242,101,34,0.25);
  }

  .testi-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    letter-spacing: -0.01em;
  }
  .testi-role {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.38);
    margin-top: 1px;
  }

  /* Verified badge */
  .testi-verified {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--teal);
    background: rgba(0,176,155,0.1);
    border: 1px solid rgba(0,176,155,0.2);
    padding: 3px 8px;
    border-radius: 100px;
    flex-shrink: 0;
  }
  .testi-verified svg { color: var(--teal); }

  /* ═══════════════════════════════════════════════
     FORM PANEL — RIGHT
  ═══════════════════════════════════════════════ */
  .form-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 56px 48px;
    position: relative;
    background: #0c0c12;
  }

  /* Subtle warm glow behind form area */
  .form-panel::before {
    content: '';
    position: absolute;
    top: 30%; left: 50%;
    transform: translate(-50%, -50%);
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(242,101,34,0.04), transparent 70%);
    pointer-events: none;
  }

  .form-wrap {
    width: 100%;
    max-width: 380px;
    position: relative;
    z-index: 1;
  }

  .form-slot { width: 100%; }

  /* Cookie notice */
  .cookie-notice {
    display: flex; align-items: flex-start; gap: 10px;
    margin-top: 24px; padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
  }
  .cookie-icon { font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
  .cookie-text { font-size: 0.75rem; color: var(--text-3); line-height: 1.55; }
  .cookie-text a {
    color: var(--text-2); text-decoration: none;
    border-bottom: 1px solid rgba(255,255,255,0.12);
    transition: color 0.2s, border-color 0.2s;
  }
  .cookie-text a:hover { color: var(--orange); border-color: var(--orange); }

  /* Back link */
  .back-link {
    position: absolute; top: 28px; right: 32px;
    display: flex; align-items: center; gap: 6px;
    font-size: 0.78rem; font-weight: 500;
    color: rgba(255,255,255,0.28);
    text-decoration: none;
    transition: color 0.2s;
  }
  .back-link:hover { color: rgba(255,255,255,0.6); }

  /* ═══════════════════════════════════════════════
     RESPONSIVE
  ═══════════════════════════════════════════════ */
  @media (max-width: 900px) {
    .login-root { grid-template-columns: 1fr; }
    .brand-panel { display: none; }
    .form-panel {
      padding: 80px 28px 48px;
      min-height: 100vh;
      background: #0c0c12;
    }
    .back-link { top: 20px; right: 20px; }
  }
</style>

<div class="login-root">

  <!-- ═══════════════════════════════════════════════
       LEFT — Brand Panel
  ═══════════════════════════════════════════════ -->
  <div class="brand-panel">

    <!-- Floating depth orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <!-- Gradient edge separator -->
    <div class="brand-separator"></div>

    <!-- ── Top content ── -->
    <div class="brand-top">

      <a href="/" class="logo-link">
        <div class="logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <circle cx="12" cy="10" r="3"/>
            <path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/>
          </svg>
        </div>
        <span class="logo-wordmark">Matatu<span>Pulse</span></span>
      </a>

      <h2 class="brand-headline">
        Nairobi's Matatu<br/>Network,<br/><em>Made Visible</em>
      </h2>

      <p class="brand-sub">
        Real-time GPS tracking, arrival alerts, and fleet intelligence — built for the roads that keep Nairobi moving.
      </p>

      <!-- Stat cards -->
      <div class="brand-stats">
        {#each [
          {
            strong: "60,000+",
            label:  "daily active riders",
            icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`
          },
          {
            strong: "9 minutes",
            label:  "average wait time saved per trip",
            icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
          },
          {
            strong: "340+ vehicles",
            label:  "tracked live across 12 partner saccos",
            icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>`
          },
        ] as s}
          <div class="brand-stat">
            <div class="stat-icon">
              {@html s.icon}
            </div>
            <div class="stat-label">
              <strong>{s.strong}</strong>
              {s.label}
            </div>
          </div>
        {/each}
      </div>

    </div>

    <!-- ── Bottom: Testimonial ── -->
    <div class="brand-bottom">
      <div class="brand-testimonial">

        <span class="testi-quote-mark">"</span>

        <div class="testi-stars">
          {#each Array(5) as _}<span class="star">★</span>{/each}
        </div>

        <p class="testi-quote">
          I no longer wait blindly at the stage. I leave only when the matatu is close — saved at least 45 minutes every single day.
        </p>

        <div class="testi-meta">
          <div class="testi-avatar">JM</div>
          <div>
            <div class="testi-name">John Mwangi</div>
            <div class="testi-role">Daily commuter, Westlands</div>
          </div>
          <div class="testi-verified">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Verified
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- ═══════════════════════════════════════════════
       RIGHT — Form Panel
  ═══════════════════════════════════════════════ -->
  <div class="form-panel">

    <a href="/" class="back-link">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back to site
    </a>

    <div class="form-wrap">
      <div class="form-slot">
        {@render children?.()}
      </div>

      {#if isEurope}
        <div class="cookie-notice">
          <span class="cookie-icon">🍪</span>
          <p class="cookie-text">
            Signing in uses cookies to maintain your session securely. By continuing you agree to our
            <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
          </p>
        </div>
      {/if}
    </div>

  </div>

</div>