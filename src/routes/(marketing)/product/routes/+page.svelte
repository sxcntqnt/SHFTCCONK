<script lang="ts">
  import HeatMap from "./HeatMap.svelte"
  import RouteTracker from "./RouteTracker.svelte"
</script>

<svelte:head>
  <title>Route Planner — Matatu Pulse | Fastest Matatu Routes in Nairobi</title>
  <meta
    name="description"
    content="Compare live ETAs across Nairobi matatu routes, avoid peak-hour gridlock, and always board the fastest vehicle. Matatu Pulse's route planner adapts to real-time traffic conditions."
  />
  <meta property="og:title" content="Route Planner — Matatu Pulse" />
  <meta
    property="og:description"
    content="Live ETA comparison, congestion-aware routing, and multi-hop trip planning for Nairobi matatu commuters."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Route Planner</div>
      <h1>The Fastest Route to<br />Your Destination, <em>Right Now</em></h1>
      <p class="hero-sub">
        Compare live ETAs across multiple matatu routes, understand peak-hour
        congestion patterns, and always board the vehicle that's actually
        moving.
      </p>
      <div class="hero-actions">
        <a href="/login" class="btn-primary"
          >Open Route Planner<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/product/features" class="btn-ghost">All Features →</a>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">How It Works</span>
      <h2 class="section-title">From "Where am I going?" to "I'm on my way"</h2>
      <p class="section-sub">
        Three steps from opening the app to boarding the right vehicle.
      </p>
      <div class="steps">
        {#each [{ n: "01", title: "Enter Your Destination", desc: "Type your destination or select from your saved frequent routes. The planner pulls available matatu routes that serve your journey.", icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` }, { n: "02", title: "Compare Live ETAs", desc: "See all available routes side by side with live ETAs, current vehicle positions, and congestion-adjusted travel times. Pick the fastest option right now.", icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }, { n: "03", title: "Get Alerted, Then Board", desc: "Set an alert for your chosen route. We'll notify you when the matatu is 2–3 minutes from your stage so you leave at exactly the right moment.", icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>` }] as s}
          <div class="step">
            <div class="step-num">Step {s.n}</div>
            <div class="step-ring">{@html s.icon}</div>
            <div class="step-title">{s.title}</div>
            <p class="step-desc">{s.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Live route examples -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Nairobi Routes</span>
      <h2 class="section-title">Routes We Currently Track</h2>
      <p class="section-sub">
        Live data from our partner sacco vehicles covers Nairobi's busiest
        corridors. New routes added regularly as our sacco network grows.
      </p>
      <RouteTracker />
    </div>
  </section>

  <!-- Congestion intelligence -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Congestion Intelligence</span>
      <h2 class="section-title">
        Nairobi Traffic Is Predictable. We Prove It.
      </h2>
      <p class="section-sub" style="margin-bottom:52px;">
        Our route planner doesn't just show you current traffic — it knows what
        current traffic means for your specific route based on years of
        accumulated trip data.
      </p>
      <div class="cong-split">
        <HeatMap />
        <div class="cong-content">
          <h3>Same Route, Very Different Journey Times</h3>
          <p>
            Thika Road northbound at 5:45pm is not the same road as Thika Road
            at 10am. Our platform knows this — and adjusts ETAs accordingly. We
            model expected journey time by time-of-day and day-of-week, so the
            34-minute ETA we show you at 5:30pm accounts for the peak-hour
            pattern, not just current vehicle speed.
          </p>
          <p>
            For Ngong Road during Friday afternoon peak, our data shows journey
            times averaging 2.3× the off-peak baseline. We factor that in before
            you even check.
          </p>
          <div class="time-pills">
            <span class="pill good">6–8am: Moving</span>
            <span class="pill bad">8–9:30am: Heavy</span>
            <span class="pill good">10am–3pm: Clear</span>
            <span class="pill bad">5–7:30pm: Gridlock</span>
            <span class="pill good">After 8pm: Fast</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Common Questions</span>
      <h2 class="section-title">Route Planner FAQ</h2>
      <p class="section-sub" style="margin-bottom:40px;">
        Everything you need to know before your first planned trip.
      </p>
      <div class="faq-list">
        {#each [{ q: "How accurate are the ETAs?", a: "ETAs are generated from live GPS positions combined with time-of-day congestion models trained on historical trip data. On uncongested routes, accuracy is typically within ±2 minutes. During heavy peak-hour traffic, variance is higher but still significantly more accurate than any schedule-based estimate." }, { q: "Does it work for routes that require transfers?", a: "Multi-hop trip planning is available in the app. You can see the full journey across two route legs, and set separate alerts for each boarding point so you know when both vehicles are approaching." }, { q: "What if my route isn't covered yet?", a: "We're adding new sacco partners and routes continuously. You can check current coverage in the app, and submit a route request if your corridor isn't yet tracked. We prioritise new routes based on rider demand signals." }, { q: "Does the route planner work offline?", a: "Core route information and previously loaded map tiles are cached locally. Live ETAs require a data connection, but the map and static route information remain accessible offline." }, { q: "How does it handle route diversions or road closures?", a: "When a vehicle goes significantly off its expected route, our deviation detection flags it within minutes. Riders on that route are notified, and alternate ETAs are recalculated if other vehicles on the route are tracked." }] as f}
          <div class="faq-item">
            <button class="faq-q"
              >{f.q}<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg
              ></button
            >
            <p class="faq-a">{f.a}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Plan Your Next Trip<br /><em>With Confidence</em></h2>
      <p>
        Open the route planner in your browser or download the app. No sign-up
        needed to compare routes and check live ETAs.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/login" class="btn-primary"
          >Open Route Planner<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/download" class="btn-ghost">Get the App →</a>
      </div>
      <p class="final-note">Free for all commuters. No account required.</p>
    </div>
  </section>
</div>

<style>
  .page {
    background: var(--ink);
  }

  .hero {
    padding: 100px 2rem 88px;
    text-align: center;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 55% 65% at 50% -5%,
      rgba(242, 101, 34, 0.12),
      transparent 60%
    );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    margin-bottom: 24px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.22);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5.5vw, 3.8rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 20px;
  }
  h1 em {
    font-style: normal;
    color: var(--orange);
  }
  .hero-sub {
    font-size: 1.1rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 580px;
    margin: 0 auto 40px;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: var(--orange);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.3);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .btn-primary:hover {
    background: #d95618;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(242, 101, 34, 0.45);
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: transparent;
    border: 1px solid var(--rim-2);
    color: var(--text-2);
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    transition:
      border-color 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .btn-ghost:hover {
    border-color: var(--rim);
    color: var(--text-1);
    transform: translateY(-2px);
  }

  .section {
    padding: 88px 2rem;
  }
  .section.alt {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    border-bottom: 1px solid var(--rim);
  }
  .inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .section-tag {
    display: inline-block;
    margin-bottom: 14px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.18);
  }
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 14px;
  }
  .section-sub {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 540px;
    margin-bottom: 52px;
  }

  /* ── HOW IT WORKS STEPS ── */
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    position: relative;
  }
  .steps::before {
    content: "";
    position: absolute;
    top: 52px;
    left: calc(16.66% + 1px);
    right: calc(16.66% + 1px);
    height: 1px;
    background: linear-gradient(90deg, var(--orange), rgba(242, 101, 34, 0.15));
  }
  .step {
    padding: 40px 28px;
    position: relative;
    z-index: 1;
  }
  .step-num {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 18px;
  }
  .step-ring {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin-bottom: 24px;
    transition:
      border-color 0.3s,
      background 0.3s;
  }
  .step:hover .step-ring {
    border-color: rgba(242, 101, 34, 0.4);
    background: rgba(242, 101, 34, 0.08);
  }
  .step-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .step-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── CONGESTION EXPLAINER ── */
  .cong-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
  }
  .cong-content h3 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-bottom: 14px;
  }
  .cong-content p {
    font-size: 0.95rem;
    color: var(--text-2);
    line-height: 1.75;
    margin-bottom: 20px;
  }
  .time-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill {
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid var(--rim-2);
    color: var(--text-2);
    background: var(--surface);
  }
  .pill.bad {
    background: rgba(242, 101, 34, 0.1);
    border-color: rgba(242, 101, 34, 0.25);
    color: var(--orange);
  }
  .pill.good {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.25);
    color: var(--teal);
  }

  /* ── FAQ ── */
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .faq-item {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    overflow: hidden;
  }
  .faq-q {
    width: 100%;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-1);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    gap: 16px;
    transition: color 0.2s;
  }
  .faq-q:hover {
    color: var(--orange);
  }
  .faq-a {
    padding: 0 24px 20px;
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
  }

  /* ── FINAL CTA ── */
  .final-cta {
    padding: 100px 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .final-cta::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 60% 60% at 50% 0%,
      rgba(242, 101, 34, 0.1),
      transparent 60%
    );
    pointer-events: none;
  }
  .final-cta-inner {
    position: relative;
    max-width: 600px;
    margin: 0 auto;
  }
  .final-cta h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .final-cta h2 em {
    font-style: normal;
    color: var(--orange);
  }
  .final-cta p {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 36px;
  }
  .final-note {
    font-size: 0.78rem;
    color: var(--text-3);
    margin-top: 20px;
  }

  @media (max-width: 900px) {
    .steps {
      grid-template-columns: 1fr;
    }
    .steps::before {
      display: none;
    }
    .step {
      border-bottom: 1px solid var(--rim);
      padding: 28px 20px;
    }
    .step:last-child {
      border-bottom: none;
    }
    .cong-split {
      grid-template-columns: 1fr;
      gap: 36px;
    }
  }
  @media (max-width: 600px) {
    .hero {
      padding: 72px 1.25rem 64px;
    }
    .section {
      padding: 64px 1.25rem;
    }
  }
</style>
