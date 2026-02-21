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
  } catch (e) {
    /* continue */
  }
</script>

<style>
  .login-root {
    min-height: 100vh;
    background: var(--ink);
    display: grid;
    grid-template-columns: 1fr 1fr;
    position: relative;
    overflow: hidden;
  }

  /* ── LEFT PANEL — brand panel ── */
  .brand-panel {
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 44px 52px;
    position: relative;
    overflow: hidden;
  }

  /* Radial glow */
  .brand-panel::before {
    content: '';
    position: absolute;
    top: -80px; left: -80px;
    width: 480px; height: 480px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(242,101,34,0.12), transparent 70%);
    pointer-events: none;
  }

  /* Dot grid texture */
  .brand-panel::after {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, var(--rim-2) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(ellipse 70% 70% at 30% 30%, black 0%, transparent 80%);
    pointer-events: none;
  }

  .brand-top { position: relative; z-index: 1; }

  .logo-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    margin-bottom: 64px;
  }
  .logo-mark {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--orange);
    display: flex; align-items: center; justify-content: center;
  }
  .logo-wordmark {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .logo-wordmark span { color: var(--orange); }

  .brand-headline {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 2.8vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 16px;
  }
  .brand-headline em { font-style: normal; color: var(--orange); }

  .brand-sub {
    font-size: 0.95rem;
    color: var(--text-2);
    line-height: 1.75;
    max-width: 340px;
    margin-bottom: 48px;
  }

  /* Stats strip */
  .brand-stats {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative; z-index: 1;
  }
  .brand-stat {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stat-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: rgba(242,101,34,0.1);
    border: 1px solid rgba(242,101,34,0.2);
    display: flex; align-items: center; justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }
  .stat-label {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.4;
  }
  .stat-label strong {
    color: var(--text-1);
    font-weight: 600;
    display: block;
  }

  /* Testimonial */
  .brand-testimonial {
    position: relative; z-index: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--rim-2);
    border-radius: 16px;
    padding: 22px 24px;
  }
  .testi-stars { display: flex; gap: 3px; margin-bottom: 10px; }
  .star { color: var(--orange); font-size: 0.75rem; }
  .testi-quote { font-size: 0.875rem; color: var(--text-1); line-height: 1.65; font-style: italic; margin-bottom: 14px; }
  .testi-meta { display: flex; align-items: center; gap: 10px; }
  .testi-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 0.65rem; font-weight: 800; color: #fff;
    flex-shrink: 0;
  }
  .testi-name { font-size: 0.78rem; font-weight: 600; color: var(--text-1); }
  .testi-role { font-size: 0.7rem; color: var(--text-3); }

  /* ── RIGHT PANEL — form ── */
  .form-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 56px 48px;
    position: relative;
  }

  .form-wrap {
    width: 100%;
    max-width: 380px;
  }

  .form-header {
    margin-bottom: 36px;
  }
  .form-eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
  }
  .form-title {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 6px;
  }
  .form-sub {
    font-size: 0.85rem;
    color: var(--text-2);
    line-height: 1.55;
  }

  /* Children slot — the actual form/auth component */
  .form-slot {
    width: 100%;
  }

  /* Cookie notice */
  .cookie-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 24px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--rim-2);
    border-radius: 10px;
  }
  .cookie-icon { font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
  .cookie-text {
    font-size: 0.75rem;
    color: var(--text-3);
    line-height: 1.55;
  }
  .cookie-text a {
    color: var(--text-2);
    text-decoration: none;
    border-bottom: 1px solid var(--rim-2);
    transition: color 0.2s, border-color 0.2s;
  }
  .cookie-text a:hover { color: var(--orange); border-color: var(--orange); }

  /* Back to site link */
  .back-link {
    position: absolute;
    top: 28px; right: 32px;
    display: flex; align-items: center; gap: 6px;
    font-size: 0.78rem; font-weight: 500; color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .back-link:hover { color: var(--text-2); }

  /* ── RESPONSIVE ── */
  @media (max-width: 860px) {
    .login-root { grid-template-columns: 1fr; }
    .brand-panel { display: none; }
    .form-panel { padding: 80px 28px 48px; min-height: 100vh; }
    .back-link { top: 20px; right: 20px; }

    /* Show minimal logo at top of form on mobile */
    .form-panel::before {
      content: '';
      position: absolute;
      top: -60px; left: 50%;
      transform: translateX(-50%);
      width: 240px; height: 240px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(242,101,34,0.08), transparent 70%);
      pointer-events: none;
    }
  }
</style>

<div class="login-root">

  <!-- ═══ LEFT: Brand Panel ═══ -->
  <div class="brand-panel">
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
        Nairobi's Matatu<br/>Network, <em>Made Visible</em>
      </h2>
      <p class="brand-sub">
        Real-time GPS tracking, arrival alerts, and fleet intelligence for 60,000+ daily riders and 12 partner saccos across Nairobi's major corridors.
      </p>

      <div class="brand-stats">
        {#each [
          { label:"Daily active riders", strong:"60,000+", icon:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
          { label:"Average wait time saved per trip", strong:"9 minutes", icon:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
          { label:"Vehicles tracked across 12 saccos", strong:"340+", icon:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>` },
        ] as s}
          <div class="brand-stat">
            <div class="stat-icon">{@html s.icon}</div>
            <div class="stat-label">
              <strong>{s.strong}</strong>
              {s.label}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Testimonial -->
    <div class="brand-testimonial">
      <div class="testi-stars">
        {#each Array(5) as _}<span class="star">★</span>{/each}
      </div>
      <p class="testi-quote">"I no longer wait blindly at the stage. I leave only when the matatu is close. Saved at least 45 minutes every day."</p>
      <div class="testi-meta">
        <div class="testi-avatar">JM</div>
        <div>
          <div class="testi-name">John Mwangi</div>
          <div class="testi-role">Daily commuter, Westlands</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ RIGHT: Form Panel ═══ -->
  <div class="form-panel">
    <a href="/" class="back-link">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back to site
    </a>

    <div class="form-wrap">
      <div class="form-header">
        <div class="form-eyebrow">Welcome back</div>
        <h1 class="form-title">Sign in to<br/>Matatu Pulse</h1>
        <p class="form-sub">Access your dashboard, fleet analytics, and account settings.</p>
      </div>

      <!-- Auth component slot -->
      <div class="form-slot">
        {@render children?.()}
      </div>

      <!-- Cookie notice — EU only -->
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