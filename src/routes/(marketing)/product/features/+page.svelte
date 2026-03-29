<svelte:head>
  <title
    >Platform Features — Matatu Pulse | Real-Time Matatu Tracking Features</title
  >
  <meta
    name="description"
    content="Explore every feature of Matatu Pulse — live GPS tracking, arrival alerts, route intelligence, fare estimates, and fleet analytics built for Nairobi's matatu network."
  />
  <meta property="og:title" content="Features — Matatu Pulse" />
  <meta
    property="og:description"
    content="Live GPS tracking, 2-minute arrival alerts, route intelligence, and fleet analytics for Nairobi matatus."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Platform Features</div>
      <h1>Everything the Platform<br />Can <em>Do for You</em></h1>
      <p class="hero-sub">
        A complete walkthrough of every capability in Matatu Pulse — from live
        GPS tracking to fleet analytics — and exactly who each feature is built
        for.
      </p>
      <div class="hero-actions">
        <a href="/download" class="btn-primary"
          >Get Started Free<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/contact_us" class="btn-ghost">Request a Demo →</a>
      </div>
    </div>
  </section>

  <!-- Core features -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Core Features</span>
      <h2 class="section-title">The Four Pillars of Matatu Pulse</h2>
      <p class="section-sub">
        Every feature we build serves one of four core functions. Here's how
        they work in detail.
      </p>

      <div class="feature-row">
        <div class="feature-panel">
          <span class="panel-label">Live Tracking Map</span>
        </div>
        <div class="feature-copy">
          <div class="feature-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><circle cx="12" cy="10" r="3" /><path
                d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"
              /></svg
            >
          </div>
          <h3 class="feature-heading">Live Vehicle Telemetry</h3>
          <p class="feature-body">
            GPS trackers installed in partner vehicles stream continuous
            position data to our servers. The map you see on your phone reflects
            where each matatu actually is, updated every few seconds — not
            estimated, not extrapolated from schedule data.
          </p>
          <ul class="feature-bullets">
            {#each ["Real position updates every 5–10 seconds", "Multiple vehicles displayed per route simultaneously", "Works on 2G, 3G, and 4G connections", "Graceful fallback display when signal is lost"] as b}
              <li class="feature-bullet">
                <span class="check"
                  ><svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                  ></span
                >{b}
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="feature-row flip">
        <div class="feature-panel">
          <span class="panel-label">Arrival Alert</span>
        </div>
        <div class="feature-copy">
          <div class="feature-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path
                d="M13.73 21a2 2 0 01-3.46 0"
              /></svg
            >
          </div>
          <h3 class="feature-heading">Arrival Predictions & Alerts</h3>
          <p class="feature-body">
            Our ETA model combines live GPS speed, current congestion levels,
            and time-of-day historical data to estimate exactly when a vehicle
            will reach your stage. A push notification fires when the ETA drops
            below 3 minutes — enough time to walk, not sprint.
          </p>
          <ul class="feature-bullets">
            {#each ["Dynamic ETA modelling, not static schedule data", "Push alerts to Android & iOS", "Configurable per stage and per route", "Accuracy improves over time as trip data accumulates"] as b}
              <li class="feature-bullet">
                <span class="check"
                  ><svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                  ></span
                >{b}
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="feature-row">
        <div class="feature-panel">
          <span class="panel-label">Route Intelligence</span>
        </div>
        <div class="feature-copy">
          <div class="feature-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg
            >
          </div>
          <h3 class="feature-heading">Dynamic Route Intelligence</h3>
          <p class="feature-body">
            Routes aren't static. Congestion patterns change by hour and day,
            and our platform knows that. Route intelligence compares current
            conditions against historical trip data to identify the fastest
            available path to your destination right now.
          </p>
          <ul class="feature-bullets">
            {#each ["Time-of-day congestion modelling", "Live ETA comparison across alternative routes", "Historical reliability scores per route", "Operator-side route deviation detection"] as b}
              <li class="feature-bullet">
                <span class="check"
                  ><svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                  ></span
                >{b}
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="feature-row flip">
        <div class="feature-panel">
          <span class="panel-label">Analytics Dashboard</span>
        </div>
        <div class="feature-copy">
          <div class="feature-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><rect x="3" y="3" width="7" height="7" /><rect
                x="14"
                y="3"
                width="7"
                height="7"
              /><rect x="14" y="14" width="7" height="7" /><rect
                x="3"
                y="14"
                width="7"
                height="7"
              /></svg
            >
          </div>
          <h3 class="feature-heading">Fleet Performance Analytics</h3>
          <p class="feature-body">
            For operators and sacco managers, the analytics dashboard turns raw
            GPS telemetry into actionable intelligence. Track trip cycles,
            identify idle time, measure route adherence, and spot revenue
            opportunities hiding in your operational data.
          </p>
          <ul class="feature-bullets">
            {#each ["Daily, weekly, and monthly trip cycle reports", "Idle time detection and location analysis", "Load pattern and demand heatmap overlays", "Driver behaviour scoring and trend monitoring"] as b}
              <li class="feature-bullet">
                <span class="check"
                  ><svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                  ></span
                >{b}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Additional features -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Additional Capabilities</span>
      <h2 class="section-title">More Tools Across the Platform</h2>
      <p class="section-sub">
        Beyond the four core pillars, Matatu Pulse includes a growing set of
        tools that add value for riders, operators, and planners.
      </p>
      <div class="mini-grid">
        {#each [{ title: "Fare Estimates", desc: "Know the approximate fare before you board — with route-specific pricing data updated as saccos adjust their rates.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` }, { title: "Offline Mode", desc: "Core map data is cached locally so you can check nearby vehicle positions even when your data connection drops temporarily.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>` }, { title: "Multi-Route Trips", desc: "Plan journeys that require transfers. See both legs of your trip on one screen and get notified when your connecting vehicle is approaching.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>` }, { title: "API Access", desc: "Developers and enterprise customers can access live and historical telemetry data via our REST and WebSocket APIs.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` }, { title: "Demand Heatmaps", desc: "Operators see where passenger demand concentrates by time of day — enabling smarter staging and dispatch decisions.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>` }, { title: "Driver Alerts", desc: "Drivers receive in-cab alerts for route deviations, compliance checks, and high-demand stage notifications.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>` }] as m}
          <div class="mini-card">
            <div class="mini-icon">{@html m.icon}</div>
            <div class="mini-title">{m.title}</div>
            <p class="mini-desc">{m.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Audience availability -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Feature Availability</span>
      <h2 class="section-title">What's Available to Each User Type</h2>
      <p class="section-sub" style="margin-bottom:40px;">
        Different features are designed for different stakeholders. Here's the
        full matrix.
      </p>
      <div style="overflow-x:auto;">
        <table class="audience-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Commuter</th>
              <th>Operator</th>
              <th>Sacco / Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {#each [["Live vehicle tracking map", true, true, true], ["Arrival alerts (push notifications)", true, false, false], ["Route comparison & ETA", true, true, true], ["Fare estimates", true, false, false], ["Offline map cache", true, false, false], ["Multi-hop trip planning", true, false, false], ["Fleet live map (all vehicles)", false, true, true], ["Delay & deviation alerts", false, true, true], ["Demand heatmaps", false, true, true], ["Trip cycle analytics", false, true, true], ["Driver behaviour scoring", false, false, true], ["API access", false, false, true], ["Custom integrations", false, false, true], ["White-label deployment", false, false, true]] as row}
              <tr>
                <td>{row[0]}</td>
                {#each row.slice(1) as val}
                  <td
                    >{#if val}<span class="tick">✓</span>{:else}<span
                        class="dash">—</span
                      >{/if}</td
                  >
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>See Every Feature<br /><em>In Action</em></h2>
      <p>
        The fastest way to understand what Matatu Pulse can do is to try it.
        Download the app free, or book a demo with our team for a guided
        walkthrough of the operator tools.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/download" class="btn-primary"
          >Get the App Free<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/contact_us" class="btn-ghost">Book a Demo →</a>
      </div>
      <p class="final-note">
        No account required for the commuter app. Operator demo takes 30
        minutes.
      </p>
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

  /* ── SECTIONS ── */
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

  /* ── FEATURE ROWS ── */
  .feature-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
    margin-bottom: 80px;
  }
  .feature-row:last-child {
    margin-bottom: 0;
  }
  .feature-row.flip {
    direction: rtl;
  }
  .feature-row.flip > * {
    direction: ltr;
  }

  .feature-panel {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    aspect-ratio: 4/3;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .feature-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 40% 40%,
      rgba(242, 101, 34, 0.07),
      transparent 70%
    );
  }
  .panel-label {
    position: relative;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .feature-copy {
  }
  .feature-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin-bottom: 20px;
  }
  .feature-heading {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .feature-body {
    font-size: 0.95rem;
    color: var(--text-2);
    line-height: 1.75;
    margin-bottom: 22px;
  }
  .feature-bullets {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .feature-bullet {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.875rem;
    color: var(--text-2);
  }
  .check {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    color: var(--orange);
  }

  /* ── SMALLER FEATURE GRID ── */
  .mini-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .mini-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .mini-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .mini-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin-bottom: 18px;
  }
  .mini-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .mini-desc {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── AUDIENCE TABLE ── */
  .audience-table {
    width: 100%;
    border-collapse: collapse;
  }
  .audience-table th {
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--rim-2);
    background: var(--surface);
  }
  .audience-table td {
    padding: 14px 16px;
    font-size: 0.875rem;
    color: var(--text-2);
    border-bottom: 1px solid var(--rim);
  }
  .audience-table td:first-child {
    color: var(--text-1);
    font-weight: 500;
  }
  .audience-table tr:last-child td {
    border-bottom: none;
  }
  .tick {
    color: var(--orange);
    font-size: 1rem;
  }
  .dash {
    color: var(--text-3);
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
    .feature-row {
      grid-template-columns: 1fr;
      gap: 36px;
    }
    .feature-row.flip {
      direction: ltr;
    }
    .mini-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .mini-grid {
      grid-template-columns: 1fr;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
    .section {
      padding: 64px 1.25rem;
    }
  }
</style>
