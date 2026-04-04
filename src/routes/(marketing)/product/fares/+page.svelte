<svelte:head>
  <title
    >Fare Estimates — Matatu Pulse | Matatu Fares in Nairobi Explained</title
  >
  <meta
    name="description"
    content="Know your matatu fare before you board. Matatu Pulse provides up-to-date fare estimates for Nairobi's major routes, including peak-hour variations and route-by-route breakdowns."
  />
  <meta property="og:title" content="Fare Estimates — Matatu Pulse" />
  <meta
    property="og:description"
    content="Real-time matatu fare estimates for Nairobi routes. Know what you'll pay before you board — including peak-hour pricing."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Fare Estimates</div>
      <h1>Know What You'll Pay<br /><em>Before You Board</em></h1>
      <p class="hero-sub">
        Matatu fares in Nairobi vary by route, time of day, and sacco. Matatu
        Pulse gives you accurate fare estimates for every tracked route so
        you're never caught short.
      </p>
      <div class="hero-actions">
        <a href="/app/dashboard" class="btn-primary"
          >Check Fares Now<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/product/routes" class="btn-ghost">View Routes →</a>
      </div>
    </div>
  </section>

  <!-- Fare table -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Current Fares</span>
      <h2 class="section-title">Nairobi Matatu Fares by Route</h2>
      <p class="section-sub">
        Estimates based on current sacco rates. Peak-hour fares apply during
        morning (6:30–9am) and evening (4:30–7:30pm) rush periods.
      </p>

      <div class="fare-table-wrap">
        <table class="fare-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Standard Fare</th>
              <th>Peak Fare</th>
              <th>Approx. Journey</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each [{ route: "CBD → Westlands", std: "KES 50", peak: "KES 70", time: "20–35 min" }, { route: "CBD → Kangemi (Rt. 46)", std: "KES 60", peak: "KES 100", time: "35–65 min" }, { route: "CBD → Kasarani", std: "KES 80", peak: "KES 120", time: "40–70 min" }, { route: "CBD → Rongai", std: "KES 100", peak: "KES 150", time: "50–90 min" }, { route: "CBD → Eastlands", std: "KES 50", peak: "KES 70", time: "25–45 min" }, { route: "CBD → Ngong", std: "KES 100", peak: "KES 160", time: "55–100 min" }, { route: "CBD → Karen", std: "KES 80", peak: "KES 120", time: "40–70 min" }, { route: "CBD → Githurai", std: "KES 70", peak: "KES 110", time: "45–80 min" }, { route: "CBD → South B / C", std: "KES 50", peak: "KES 70", time: "20–40 min" }, { route: "CBD → Ruaka", std: "KES 80", peak: "KES 130", time: "45–80 min" }] as r}
              <tr>
                <td class="route-cell">{r.route}</td>
                <td><span class="fare-val">{r.std}</span></td>
                <td><span class="fare-peak">{r.peak}</span></td>
                <td>{r.time}</td>
                <td><span class="status-dot dot-live">Live</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px;">
        <div class="disclaimer">
          <div class="disclaimer-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              ><circle cx="12" cy="12" r="10" /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
            >
          </div>
          <p>
            <strong>Note:</strong> Fares listed are estimates based on reported sacco
            rates and rider-submitted data. Actual fares may vary by specific vehicle,
            conductor, or current petrol prices. Matatu Pulse updates fare data regularly
            but does not set or guarantee fares. Always confirm with the conductor
            before boarding.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- How fares work -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">How Matatu Fares Work</span>
      <h2 class="section-title">Why Fares Change — and When</h2>
      <p class="section-sub">
        Matatu fares in Nairobi aren't fixed by the government. Here's what
        actually determines what you pay.
      </p>
      <div class="how-grid">
        {#each [{ title: "Sacco-Set Base Rates", desc: "Each sacco sets its own standard fare for a given route, typically based on fuel costs, route distance, and competition from other saccos or alternative routes.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` }, { title: "Peak-Hour Surcharges", desc: "During morning and evening rush hours, most saccos charge a higher fare — typically 30–60% above the standard rate — reflecting higher demand and slower turnaround times.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` }, { title: "Fuel Price Adjustments", desc: "When pump prices rise significantly, saccos adjust fares upward — sometimes overnight. Matatu Pulse updates estimates as these changes are reported by our partner saccos and rider community.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>` }, { title: "Route Variations", desc: "The same destination can cost different amounts depending on your boarding stage. Boarding at a terminus is usually cheaper than boarding mid-route on a partially-filled vehicle.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>` }, { title: "Competition Pricing", desc: "On routes served by multiple saccos, competition can keep fares lower than on monopoly routes. Our data shows up to 30% fare variation between competing routes to the same destination.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }, { title: "Live Updates", desc: "When saccos in our partner network change their rates, we update the estimates in-app within 24 hours. Riders can also flag incorrect fares directly in the app.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>` }] as h}
          <div class="how-card">
            <div class="how-icon">{@html h.icon}</div>
            <div class="how-title">{h.title}</div>
            <p class="how-desc">{h.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Commuter tips -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Commuter Tips</span>
      <h2 class="section-title" style="margin-bottom:48px;">
        How to Pay Less and Wait Less
      </h2>
      <div class="tips-split">
        <div class="tips-content">
          <h3>Timing Is Everything</h3>
          <p>
            The single biggest lever a Nairobi commuter has over their daily
            transport cost is when they travel. Peak-hour surcharges on most
            routes add KES 30–60 per trip — that's KES 1,200–2,400 per month for
            a daily commuter, purely from timing.
          </p>
          <p>
            Matatu Pulse shows you live ETAs so you can optimise departure time
            — leaving earlier on a clear route costs you nothing extra and saves
            you both time and money.
          </p>
        </div>
        <div class="tip-list">
          {#each [{ n: "01", text: "<strong>Board at the terminus</strong> rather than mid-route where possible. Terminus fares are typically lower and you're guaranteed a seat." }, { n: "02", text: "<strong>Travel 30 minutes before peak</strong>. The fare is standard, the vehicle is less crowded, and your journey time is significantly shorter." }, { n: "03", text: "<strong>Compare routes in the app</strong> before heading to the stage. Parallel routes sometimes offer the same destination at a lower fare due to sacco competition." }, { n: "04", text: "<strong>Flag fare changes</strong> in the app when you notice they've changed. Your report helps keep estimates accurate for the entire community." }, { n: "05", text: "<strong>Check Friday evenings</strong> separately — end-of-week evening peak is Nairobi's most expensive and slowest period for most outbound routes." }] as t}
            <div class="tip">
              <div class="tip-num">{t.n}</div>
              <p class="tip-text">{@html t.text}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Always Know the Fare<br /><em>Before You Board</em></h2>
      <p>
        Check live fare estimates, compare routes, and set arrival alerts — all
        free in the Matatu Pulse app or web tracker.
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
        <a href="/app/dashboard" class="btn-ghost">Check Fares in Browser →</a>
      </div>
      <p class="final-note">
        Free for all riders. Fare data updated daily from partner saccos.
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

  /* ── FARE TABLE ── */
  .fare-table-wrap {
    overflow-x: auto;
  }
  .fare-table {
    width: 100%;
    border-collapse: collapse;
  }
  .fare-table thead tr {
    background: var(--surface);
  }
  .fare-table th {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 14px 18px;
    text-align: left;
    border-bottom: 1px solid var(--rim-2);
  }
  .fare-table td {
    padding: 16px 18px;
    font-size: 0.875rem;
    color: var(--text-2);
    border-bottom: 1px solid var(--rim);
  }
  .fare-table tr:last-child td {
    border-bottom: none;
  }
  .fare-table tr:hover td {
    background: rgba(255, 255, 255, 0.015);
  }
  .route-cell {
    font-weight: 600;
    color: var(--text-1);
  }
  .fare-val {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--orange);
    font-size: 0.95rem;
  }
  .fare-peak {
    color: var(--text-2);
    font-size: 0.82rem;
  }
  .status-dot {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .dot-live {
    color: var(--teal);
  }
  .dot-live::before {
    content: "";
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
  }

  /* ── HOW FARES WORK ── */
  .how-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .how-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .how-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .how-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin-bottom: 18px;
  }
  .how-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .how-desc {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── TIPS SECTION ── */
  .tips-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: start;
  }
  .tips-content h3 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .tips-content p {
    font-size: 0.95rem;
    color: var(--text-2);
    line-height: 1.75;
    margin-bottom: 20px;
  }
  .tip-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tip {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 16px 18px;
  }
  .tip-num {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    color: rgba(242, 101, 34, 0.4);
    letter-spacing: -0.03em;
    flex-shrink: 0;
    line-height: 1.3;
  }
  .tip-text {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.65;
  }
  .tip-text strong {
    color: var(--text-1);
    font-weight: 600;
  }

  /* ── DISCLAIMER ── */
  .disclaimer {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 24px 28px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .disclaimer-icon {
    color: var(--text-3);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .disclaimer p {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.65;
  }
  .disclaimer p strong {
    color: var(--text-2);
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
    .how-grid {
      grid-template-columns: 1fr 1fr;
    }
    .tips-split {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }
  @media (max-width: 600px) {
    .how-grid {
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
