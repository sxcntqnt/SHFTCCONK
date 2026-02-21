<svelte:head>
  <title>For Operators & Drivers — Matatu Pulse | Fleet Intelligence for Nairobi Matatus</title>
  <meta name="description" content="Matatu Pulse gives matatu operators and drivers real-time fleet visibility, demand heatmaps, route adherence monitoring, and delay alerts to maximise daily trips and revenue." />
  <meta property="og:title" content="For Operators — Matatu Pulse" />
  <meta property="og:description" content="Real-time fleet tracking, demand heatmaps, and operational alerts built for Nairobi matatu operators and drivers." />
</svelte:head>

<style>
  .page { background: var(--ink); }

  .hero {
    padding: 100px 2rem 88px; text-align: center;
    position: relative; overflow: hidden;
    border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 55% 65% at 50% -5%, rgba(0,176,155,0.1), transparent 60%);
    pointer-events: none;
  }
  .hero-inner { position: relative; max-width: 740px; margin: 0 auto; }

  .eyebrow {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 14px; margin-bottom: 24px;
    background: rgba(0,176,155,0.1); border: 1px solid rgba(0,176,155,0.25);
    border-radius: 100px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--teal);
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5.5vw, 3.8rem);
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.1; margin-bottom: 20px;
  }
  h1 em { font-style: normal; color: var(--teal); }
  .hero-sub { font-size: 1.1rem; color: var(--text-2); line-height: 1.7; max-width: 580px; margin: 0 auto 40px; }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }

  .btn-teal {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px; background: var(--teal); color: #fff;
    font-weight: 700; font-size: 0.9rem; border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(0,176,155,0.3);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-teal:hover { background: #009b88; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,176,155,0.45); }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: transparent;
    border: 1px solid var(--rim-2); color: var(--text-2);
    font-weight: 600; font-size: 0.9rem; border-radius: 100px;
    text-decoration: none; transition: border-color 0.2s, color 0.2s, transform 0.15s;
  }
  .btn-ghost:hover { border-color: var(--rim); color: var(--text-1); transform: translateY(-2px); }

  /* ── STATS ── */
  .stats-band {
    background: var(--ink-2); border-bottom: 1px solid var(--rim);
    padding: 48px 2rem;
  }
  .stats-inner {
    max-width: 900px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(4,1fr);
  }
  .stat {
    text-align: center; padding: 16px;
    border-right: 1px solid var(--rim);
  }
  .stat:last-child { border-right: none; }
  .stat-val {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    font-weight: 800; color: var(--teal); letter-spacing: -0.04em;
    line-height: 1; margin-bottom: 6px;
  }
  .stat-lbl { font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 500; }

  /* ── SECTIONS ── */
  .section { padding: 88px 2rem; }
  .section.alt { background: var(--ink-2); border-top: 1px solid var(--rim); border-bottom: 1px solid var(--rim); }
  .inner { max-width: 1100px; margin: 0 auto; }

  .section-tag {
    display: inline-block; margin-bottom: 14px;
    padding: 4px 12px; border-radius: 100px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--teal);
    background: rgba(0,176,155,0.08); border: 1px solid rgba(0,176,155,0.2);
  }
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800; letter-spacing: -0.03em;
    color: var(--text-1); line-height: 1.15; margin-bottom: 14px;
  }
  .section-sub { font-size: 1rem; color: var(--text-2); line-height: 1.7; max-width: 520px; margin-bottom: 52px; }

  /* ── CAPABILITY CARDS ── */
  .cap-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
  .cap-card {
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 20px; padding: 32px 28px;
    position: relative; overflow: hidden;
    transition: border-color 0.3s, transform 0.3s;
  }
  .cap-card::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--rim-2), transparent);
  }
  .cap-card:hover { border-color: rgba(0,176,155,0.3); transform: translateY(-3px); }
  .cap-icon {
    width: 46px; height: 46px; border-radius: 13px;
    background: rgba(0,176,155,0.1); border: 1px solid rgba(0,176,155,0.2);
    display: flex; align-items: center; justify-content: center;
    color: var(--teal); margin-bottom: 20px;
  }
  .cap-title { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--text-1); margin-bottom: 10px; letter-spacing: -0.02em; }
  .cap-desc { font-size: 0.875rem; color: var(--text-2); line-height: 1.7; }

  /* ── RESULTS TABLE ── */
  .results-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
  .result-card {
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 16px; padding: 28px 24px;
    display: flex; gap: 20px; align-items: flex-start;
  }
  .result-num {
    font-family: var(--font-display);
    font-size: 2rem; font-weight: 800; color: var(--teal);
    letter-spacing: -0.05em; line-height: 1; flex-shrink: 0;
  }
  .result-label { font-size: 0.875rem; font-weight: 600; color: var(--text-1); margin-bottom: 4px; }
  .result-desc { font-size: 0.8rem; color: var(--text-2); line-height: 1.55; }

  /* ── TESTIMONIALS ── */
  .testi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
  .testi-card {
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 16px; padding: 28px;
  }
  .testi-card:hover { border-color: rgba(0,176,155,0.25); }
  .stars { display: flex; gap: 3px; margin-bottom: 14px; }
  .star { color: var(--orange); font-size: 0.8rem; }
  .testi-text { font-size: 0.9rem; color: var(--text-1); line-height: 1.7; font-style: italic; margin-bottom: 18px; }
  .testi-meta { display: flex; align-items: center; gap: 10px; }
  .testi-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--teal), #009b88);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 0.72rem; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .testi-name { font-size: 0.82rem; font-weight: 600; color: var(--text-1); }
  .testi-role { font-size: 0.72rem; color: var(--text-3); }

  /* ── FINAL CTA ── */
  .final-cta { padding: 100px 2rem; text-align: center; position: relative; overflow: hidden; }
  .final-cta::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 60% at 50% 0%, rgba(0,176,155,0.08), transparent 60%);
    pointer-events: none;
  }
  .final-cta-inner { position: relative; max-width: 600px; margin: 0 auto; }
  .final-cta h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.1; margin-bottom: 16px;
  }
  .final-cta h2 em { font-style: normal; color: var(--teal); }
  .final-cta p { font-size: 1rem; color: var(--text-2); line-height: 1.7; margin-bottom: 36px; }
  .final-note { font-size: 0.78rem; color: var(--text-3); margin-top: 20px; }

  @media (max-width: 900px) {
    .stats-inner { grid-template-columns: repeat(2,1fr); }
    .stat:nth-child(2) { border-right: none; }
    .stat:nth-child(3) { border-right: 1px solid var(--rim); }
    .cap-grid { grid-template-columns: 1fr; }
    .results-grid { grid-template-columns: 1fr; }
    .testi-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .stats-inner { grid-template-columns: repeat(2,1fr); }
    .hero { padding: 72px 1.25rem 64px; }
    .section { padding: 64px 1.25rem; }
  }
</style>

<div class="page">

  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">For Operators & Drivers</div>
      <h1>Run More Trips.<br/><em>With Less Guesswork.</em></h1>
      <p class="hero-sub">Real-time fleet visibility, demand heatmaps, and delay alerts built specifically for Nairobi matatu operators. Know where your vehicles are and where your passengers are waiting.</p>
      <div class="hero-actions">
        <a href="/contact" class="btn-teal">Request a Demo<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        <a href="/solutions/enterprise" class="btn-ghost">Enterprise Plans →</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <div class="stats-band">
    <div class="stats-inner">
      {#each [
        { val:"18%", lbl:"More Trips Per Day" },
        { val:"34%", lbl:"Reduced Idle Time" },
        { val:"2.4×", lbl:"Faster Incident Response" },
        { val:"91%", lbl:"Operator Satisfaction" },
      ] as s}
        <div class="stat"><div class="stat-val">{s.val}</div><div class="stat-lbl">{s.lbl}</div></div>
      {/each}
    </div>
  </div>

  <!-- Capabilities -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Platform Capabilities</span>
      <h2 class="section-title">Built for the Realities of Nairobi Operations</h2>
      <p class="section-sub">Tools that work on 3G, require no expensive hardware upgrades, and integrate with your existing sacco structure.</p>

      <div class="cap-grid">
        {#each [
          { title:"Live Fleet Map", desc:"See every tracked vehicle across your entire fleet in real time. Spot late vehicles, monitor route adherence, and redirect capacity before passengers are affected.", icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>` },
          { title:"Demand Heatmaps", desc:"See where passengers are concentrating on your routes, updated in real time. Stage the right number of vehicles at the right locations — not from habit, from data.", icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
          { title:"Delay & Deviation Alerts", desc:"Automatic notifications when a vehicle goes off-route, stalls, or falls significantly behind schedule. React in minutes, not when the driver eventually calls in.", icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>` },
          { title:"Trip Cycle Analytics", desc:"Full historical data on trip duration, idle time, load patterns, and turnaround efficiency. Identify underperforming vehicles and routes, and make evidence-based operational changes.", icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
        ] as c}
          <div class="cap-card">
            <div class="cap-icon">{@html c.icon}</div>
            <div class="cap-title">{c.title}</div>
            <p class="cap-desc">{c.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Results -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Measured Results</span>
      <h2 class="section-title">What Operators Are Seeing After 90 Days</h2>
      <p class="section-sub">Data from our partner saccos tracked across six routes over three months.</p>
      <div class="results-grid">
        {#each [
          { val:"18%", label:"More Trips Per Day", desc:"Operators using demand heatmaps consistently run more completed trips per vehicle per day by reducing time spent waiting at understaged terminuses." },
          { val:"34%", label:"Reduction in Idle Time", desc:"Real-time visibility into vehicle positions allows dispatch to identify and address idle vehicles at terminuses significantly faster than with phone-based check-ins." },
          { val:"23%", label:"Fewer Peak Delays", desc:"Route 46 pilot with Supermetro Sacco showed a 23% reduction in delays during peak hours after operators began using live deviation alerts." },
          { val:"91%", label:"Would Recommend", desc:"Of operators surveyed after 90 days of platform use said they would recommend Matatu Pulse to another sacco manager." },
        ] as r}
          <div class="result-card">
            <div class="result-num">{r.val}</div>
            <div><div class="result-label">{r.label}</div><p class="result-desc">{r.desc}</p></div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">From Operators</span>
      <h2 class="section-title">Sacco Managers Who've Made the Switch</h2>
      <div class="testi-grid" style="margin-top:40px;">
        {#each [
          { name:"Grace Wanjiku", role:"Operations Manager, Sacco Partner", text:"We can now see delays immediately and redirect vehicles accordingly. Before, we'd only find out about problems when passengers started calling to complain.", rating:4 },
          { name:"Esther Muthoni", role:"Fleet Coordinator", text:"Passengers complain less because they already know about delays before they arrive at the stage. That alone has changed how our riders feel about us.", rating:4 },
          { name:"David Otieno", role:"Fleet Owner", text:"We identified idle vehicles sitting at terminuses we didn't even know about. Fixing that alone increased our daily trip count immediately.", rating:5 },
          { name:"James Njoroge", role:"Sacco Chairman", text:"The data we get from the platform has changed how we plan our fleet. We're making decisions from numbers now, not guesses.", rating:5 },
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

  <!-- Final CTA -->
  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Ready to Run a <em>Smarter Fleet?</em></h2>
      <p>Book a 30-minute demo with our team. We'll show you exactly what the platform looks like on your routes and your vehicles.</p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/contact" class="btn-teal">Book a Demo<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        <a href="/solutions/enterprise" class="btn-ghost">Enterprise Plans →</a>
      </div>
      <p class="final-note">No long-term commitment required for the initial pilot. Setup takes less than a week.</p>
    </div>
  </section>

</div>