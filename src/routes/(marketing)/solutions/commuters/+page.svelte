<svelte:head>
  <title>For Commuters — Matatu Pulse | Live Matatu Tracking in Nairobi</title>
  <meta name="description" content="Stop guessing when your matatu arrives. Matatu Pulse gives Nairobi commuters live vehicle positions, accurate ETAs, and 2-minute arrival alerts — free, forever." />
  <meta property="og:title" content="For Commuters — Matatu Pulse" />
  <meta property="og:description" content="Live matatu tracking, arrival alerts, and route comparison for Nairobi riders. Free to use." />
</svelte:head>

<style>
  .page { background: var(--ink); }

  /* ── HERO ── */
  .hero {
    padding: 100px 2rem 88px;
    text-align: center;
    position: relative; overflow: hidden;
    border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 55% 65% at 50% -5%, rgba(242,101,34,0.13), transparent 60%);
    pointer-events: none;
  }
  .hero-inner { position: relative; max-width: 720px; margin: 0 auto; }

  .eyebrow {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 14px; margin-bottom: 24px;
    background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.22);
    border-radius: 100px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--orange);
  }
  .eyebrow-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--orange);
    animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5.5vw, 3.8rem);
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.1; margin-bottom: 20px;
  }
  h1 em { font-style: normal; color: var(--orange); }

  .hero-sub {
    font-size: 1.1rem; color: var(--text-2); line-height: 1.7;
    max-width: 580px; margin: 0 auto 40px;
  }

  .hero-actions {
    display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
  }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; background: var(--orange); color: #fff;
    font-weight: 700; font-size: 0.9rem; border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(242,101,34,0.3);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-primary:hover { background: #d95618; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(242,101,34,0.45); }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: transparent;
    border: 1px solid var(--rim-2); color: var(--text-2);
    font-weight: 600; font-size: 0.9rem; border-radius: 100px;
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s, transform 0.15s;
  }
  .btn-ghost:hover { border-color: var(--rim); color: var(--text-1); transform: translateY(-2px); }

  /* ── SECTION COMMON ── */
  .section { padding: 88px 2rem; }
  .section.alt { background: var(--ink-2); border-top: 1px solid var(--rim); border-bottom: 1px solid var(--rim); }
  .inner { max-width: 1100px; margin: 0 auto; }

  .section-tag {
    display: inline-block; margin-bottom: 14px;
    padding: 4px 12px; border-radius: 100px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--orange);
    background: rgba(242,101,34,0.08); border: 1px solid rgba(242,101,34,0.18);
  }
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800; letter-spacing: -0.03em;
    color: var(--text-1); line-height: 1.15; margin-bottom: 14px;
  }
  .section-sub {
    font-size: 1rem; color: var(--text-2); line-height: 1.7;
    max-width: 520px; margin-bottom: 56px;
  }

  /* ── PAIN POINTS ── */
  .pain-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
  }
  .pain-card {
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 18px; padding: 28px 24px;
    transition: border-color 0.3s;
  }
  .pain-card:hover { border-color: var(--rim-2); }
  .pain-num {
    font-family: var(--font-display);
    font-size: 2rem; font-weight: 800;
    color: rgba(242,101,34,0.25); letter-spacing: -0.05em;
    line-height: 1; margin-bottom: 14px;
  }
  .pain-title {
    font-family: var(--font-display);
    font-size: 1rem; font-weight: 700; color: var(--text-1);
    margin-bottom: 8px;
  }
  .pain-desc { font-size: 0.875rem; color: var(--text-2); line-height: 1.65; }

  /* ── FEATURES SPLIT ── */
  .feature-split {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 64px; align-items: center; margin-bottom: 72px;
  }
  .feature-split:last-child { margin-bottom: 0; }
  .feature-split.reverse { direction: rtl; }
  .feature-split.reverse > * { direction: ltr; }

  .feature-visual {
    background: var(--surface);
    border: 1px solid var(--rim); border-radius: 20px;
    aspect-ratio: 4/3; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .feature-visual::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at 40% 40%, rgba(242,101,34,0.08), transparent 70%);
  }
  .feature-visual-label {
    font-family: var(--font-display);
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-3);
  }

  .feature-content {}
  .feature-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
    color: var(--orange);
  }
  .feature-title {
    font-family: var(--font-display);
    font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em;
    color: var(--text-1); line-height: 1.2; margin-bottom: 12px;
  }
  .feature-desc {
    font-size: 0.95rem; color: var(--text-2); line-height: 1.75;
    margin-bottom: 20px;
  }
  .feature-bullets { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .feature-bullet {
    display: flex; align-items: flex-start; gap: 10px;
    font-size: 0.875rem; color: var(--text-2);
  }
  .check {
    flex-shrink: 0; width: 18px; height: 18px; border-radius: 5px;
    background: rgba(242,101,34,0.12); border: 1px solid rgba(242,101,34,0.25);
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px; color: var(--orange);
  }

  /* ── TESTIMONIALS ── */
  .testi-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
  }
  .testi-card {
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 16px; padding: 26px;
    transition: border-color 0.3s;
  }
  .testi-card:hover { border-color: var(--rim-2); }
  .stars { display: flex; gap: 3px; margin-bottom: 14px; }
  .star { color: var(--orange); font-size: 0.8rem; }
  .testi-text { font-size: 0.9rem; color: var(--text-1); line-height: 1.7; font-style: italic; margin-bottom: 18px; }
  .testi-meta { display: flex; align-items: center; gap: 10px; }
  .testi-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 0.72rem; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }
  .testi-name { font-size: 0.82rem; font-weight: 600; color: var(--text-1); }
  .testi-role { font-size: 0.72rem; color: var(--text-3); }

  /* ── FINAL CTA ── */
  .final-cta {
    padding: 100px 2rem; text-align: center;
    position: relative; overflow: hidden;
  }
  .final-cta::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 60% at 50% 0%, rgba(242,101,34,0.1), transparent 60%);
    pointer-events: none;
  }
  .final-cta-inner { position: relative; max-width: 600px; margin: 0 auto; }
  .final-cta h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.1; margin-bottom: 16px;
  }
  .final-cta h2 em { font-style: normal; color: var(--orange); }
  .final-cta p { font-size: 1rem; color: var(--text-2); line-height: 1.7; margin-bottom: 36px; }
  .final-note { font-size: 0.78rem; color: var(--text-3); margin-top: 20px; }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .pain-grid { grid-template-columns: 1fr 1fr; }
    .feature-split { grid-template-columns: 1fr; gap: 36px; }
    .feature-split.reverse { direction: ltr; }
    .testi-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 600px) {
    .pain-grid { grid-template-columns: 1fr; }
    .testi-grid { grid-template-columns: 1fr; }
    .hero { padding: 72px 1.25rem 64px; }
    .section { padding: 64px 1.25rem; }
  }
</style>

<div class="page">

  <!-- ═══ HERO ═══ -->
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="eyebrow-dot"></span> For Commuters</div>
      <h1>Your Commute,<br/><em>Finally Predictable</em></h1>
      <p class="hero-sub">
        See exactly where your matatu is in real time. Get accurate arrival predictions 
        and a 2-minute alert before it reaches your stage — completely free.
      </p>
      <div class="hero-actions">
        <a href="/download" class="btn-primary">
          Get the App — Free
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <a href="/app/dashboard" class="btn-ghost">Try Live Tracker →</a>
      </div>
    </div>
  </section>

  <!-- ═══ PAIN POINTS ═══ -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">The Problem</span>
      <h2 class="section-title">The Nairobi Commute Has Always Meant Uncertainty</h2>
      <p class="section-sub">Every rider knows the feeling. Matatu Pulse was built to eliminate it.</p>

      <div class="pain-grid">
        {#each [
          { n:"01", title:"Blind Waiting", desc:"Standing at the stage with no idea if the next matatu is 2 minutes or 20 away. You build in a buffer — and waste time every single day." },
          { n:"02", title:"Missed Connections", desc:"You board a matatu heading for a transfer point, not knowing if your connecting route is already packed or delayed. Planning is impossible." },
          { n:"03", title:"Route Uncertainty", desc:"When traffic hits, you don't know if your usual route is gridlocked or whether an alternative would be faster. You guess — and often guess wrong." },
        ] as p}
          <div class="pain-card">
            <div class="pain-num">{p.n}</div>
            <div class="pain-title">{p.title}</div>
            <p class="pain-desc">{p.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ═══ FEATURES ═══ -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">How It Works</span>
      <h2 class="section-title">Everything You Need for a Stress-Free Commute</h2>
      <p class="section-sub">Three core tools, working together to give you full visibility over your journey.</p>

      <div class="feature-split">
        <div class="feature-visual">
          <span class="feature-visual-label">Live Map View</span>
        </div>
        <div class="feature-content">
          <div class="feature-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>
          </div>
          <h3 class="feature-title">See Your Matatu Moving, Right Now</h3>
          <p class="feature-desc">A live map shows every tracked vehicle on your route, updating in real time from onboard GPS. You know exactly how far away the next matatu is before you leave the house.</p>
          <ul class="feature-bullets">
            {#each ["Second-level GPS position updates","Multiple vehicles shown per route","Works on 3G with no lag"] as b}
              <li class="feature-bullet"><span class="check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>{b}</li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="feature-split reverse">
        <div class="feature-visual">
          <span class="feature-visual-label">Arrival Alert</span>
        </div>
        <div class="feature-content">
          <div class="feature-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <h3 class="feature-title">A 2-Minute Alert Before It Arrives</h3>
          <p class="feature-desc">Our ETA model factors in current speed, congestion patterns, and historical trip data to fire a push notification exactly when you need it — giving you time to walk to the stage, not sprint.</p>
          <ul class="feature-bullets">
            {#each ["Push notifications to Android & iOS","Calibrated to current traffic conditions","Configurable for your usual stage"] as b}
              <li class="feature-bullet"><span class="check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>{b}</li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="feature-split">
        <div class="feature-visual">
          <span class="feature-visual-label">Route Comparison</span>
        </div>
        <div class="feature-content">
          <div class="feature-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 class="feature-title">Pick the Fastest Route, Every Time</h3>
          <p class="feature-desc">When multiple routes serve your destination, compare live ETAs side by side. Skip the gridlocked option and board the vehicle that's actually moving.</p>
          <ul class="feature-bullets">
            {#each ["Live ETA comparison across routes","Congestion-aware travel time estimates","Historical reliability scores per route"] as b}
              <li class="feature-bullet"><span class="check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>{b}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ TESTIMONIALS ═══ -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Rider Stories</span>
      <h2 class="section-title">What Nairobi Commuters Are Saying</h2>
      <p class="section-sub" style="margin-bottom:40px;">Thousands of daily riders have made Matatu Pulse part of their morning routine.</p>

      <div class="testi-grid">
        {#each [
          { name:"John Mwangi", role:"Daily commuter, Westlands", text:"I no longer wait blindly at the stage. I leave only when the matatu is close. I've saved at least 45 minutes every day.", rating:5 },
          { name:"Peter Kamau", role:"CBD commuter", text:"Arrival prediction completely changed my morning routine. I drink my tea first now instead of rushing to the stage.", rating:5 },
          { name:"Sarah Njeri", role:"Commuter, Ngong Road", text:"The fastest route suggestions save me so much time every week. I discovered a better route I never knew existed.", rating:5 },
        ] as t}
          <div class="testi-card">
            <div class="stars">{#each Array(t.rating) as _}<span class="star">★</span>{/each}</div>
            <p class="testi-text">"{t.text}"</p>
            <div class="testi-meta">
              <div class="testi-avatar">{t.name.charAt(0)}</div>
              <div><div class="testi-name">{t.name}</div><div class="testi-role">{t.role}</div></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ═══ FINAL CTA ═══ -->
  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Start Your First <em>Predictable</em> Commute Today</h2>
      <p>Free for all riders. No account needed to start tracking. Works in your browser or on the app.</p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/download" class="btn-primary">Get the App — Free<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        <a href="/app/dashboard" class="btn-ghost">Try in Browser →</a>
      </div>
      <p class="final-note">No credit card. No sign-up required. Just open and track.</p>
    </div>
  </section>

</div>