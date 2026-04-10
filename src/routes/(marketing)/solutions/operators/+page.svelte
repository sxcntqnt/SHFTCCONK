<svelte:head>
  <title
    >SACCO & Operator Accounts — Matatu Pulse | Transit Intelligence for Nairobi
    Operators</title
  >
  <meta
    name="description"
    content="Open a SACCO operator account on Matatu Pulse. Access the Traffic Store, manage your booking ledger, track route yield intelligence, and connect your fleet to enterprise demand across Nairobi."
  />
  <meta property="og:title" content="Operator Accounts — Matatu Pulse" />
  <meta
    property="og:description"
    content="The business account for Nairobi matatu operators. Route yield intelligence, private booking ledger, and direct access to enterprise fleet demand."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">For SACCOs & Operators</div>
      <h1>The Business Account<br /><em>for Nairobi Transit.</em></h1>
      <p class="hero-sub">
        SACCOs manage vehicles. We manage intelligence and reservations. Open an
        operator account to access route yield data, a private booking ledger,
        and direct connections to enterprise fleet demand across the network.
      </p>
      <div class="hero-actions">
        <a href="/contact_us" class="btn-teal">
          Open an Operator Account
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          >
        </a>
        <a href="/solutions/enterprise" class="btn-ghost"
          >For Business Clients →</a
        >
      </div>
    </div>
  </section>

  <!-- Stats band -->
  <div class="stats-band">
    <div class="stats-inner">
      {#each [{ val: "18 mo", lbl: "of Route Pattern History" }, { val: "90 min", lbl: "Predictive Flow Forecasting" }, { val: "KES 0", lbl: "Commission on Data Access" }, { val: "1 ledger", lbl: "Unified Booking Audit Trail" }] as s}
        <div class="stat">
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.lbl}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- What this account is -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">What the Operator Account Is</span>
      <h2 class="section-title">
        Not a Tracking Dashboard.<br />An Intelligence Layer.
      </h2>
      <p class="section-sub">
        The operator account is not about watching vehicles move. It is about
        understanding where demand concentrates, which corridors generate yield,
        and how to position your fleet to capture enterprise booking requests
        before competitors do.
      </p>

      <div class="pillars-grid">
        {#each [{ tag: "Intelligence", title: "Query the Traffic Store", desc: "Access proprietary H3-grid data covering every major node and corridor in Nairobi. Filter Node Saturation by time-of-day, review Transfer Velocity scores, and identify exactly where passenger demand peaks — before you stage vehicles.", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` }, { tag: "Access", title: "Private Booking Ledger", desc: "When enterprises reserve fleet capacity through the platform, those bookings route directly to verified operator accounts. Your vehicles, your routes, managed through a single auditable ledger — no informal phone chains, no missed revenue.", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` }, { tag: "Revenue", title: "Route Yield Modeling", desc: "Compare revenue potential against operational cost across every corridor you run. Simulate the impact of adding units during predicted peak flow. Review historical cost-per-kilometre benchmarks to make evidence-based deployment decisions.", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }, { tag: "Accountability", title: "Driver Performance Tracking", desc: "Route adherence data, turnaround efficiency, idle-time flags, and trip completion rates — all attributed per driver and per vehicle. Build a performance record that qualifies your fleet for priority placement in enterprise booking requests.", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }] as p}
          <div class="pillar-card">
            <div class="pillar-header">
              <div class="pillar-icon">{@html p.icon}</div>
              <span class="pillar-tag">{p.tag}</span>
            </div>
            <div class="pillar-title">{p.title}</div>
            <p class="pillar-desc">{p.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Traffic Store deep-dive -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">The Traffic Store</span>
      <h2 class="section-title">
        A Searchable Inventory<br />of Urban Movement
      </h2>
      <p class="section-sub">
        Not a heatmap. A queryable dataset of commuter behaviour across every
        major node and corridor in Nairobi, updated continuously from the
        network.
      </p>

      <div class="store-grid">
        {#each [{ metric: "Node Saturation", desc: "How many passengers pass through a terminus relative to its capacity at any given hour. Tells you where demand is stagnant vs. moving — and where your vehicles will fill fastest.", query: "GET /api/v1/nodes/{id}/saturation" }, { metric: "Transfer Velocity", desc: "The speed at which passengers move between transit connections at a node. Low Transfer Velocity means long dwell time — high staging opportunity for operators positioned nearby.", query: "GET /api/v1/h3/{cell_id}/metrics" }, { metric: "Corridor Analytics", desc: "Fuel-burn rates, idling hotspots, and vehicle stress zones across every major route. Optimise your operational cost against real corridor conditions, not assumptions.", query: "GET /api/v1/corridors/{id}/analytics" }, { metric: "90-Minute Forecasting", desc: "Predictive flow modelling that surfaces demand surges 90 minutes before they materialise. Stage vehicles ahead of the peak — not during it.", query: "GET /api/v1/predictions/flow/{node_id}" }] as m}
          <div class="store-card">
            <div class="store-metric">{m.metric}</div>
            <p class="store-desc">{m.desc}</p>
            <div class="store-query">{m.query}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Enterprise booking pipeline -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Enterprise Booking Pipeline</span>
      <h2 class="section-title">
        Your Fleet, Connected to<br />Formal Business Demand
      </h2>
      <p class="section-sub">
        Corporations, event organisers, and government agencies book fleet
        capacity through the platform's private reservation layer. Verified
        operator accounts with strong performance records receive priority
        placement in those requests.
      </p>

      <div class="pipeline-list">
        {#each [{ step: "01", title: "Enterprise Initiates a Booking Request", desc: "A corporate HR team, event coordinator, or logistics manager submits a fleet reservation for a specific route, time-block, and vehicle count via the platform's reservation engine." }, { step: "02", title: "Matched to Verified Operator Accounts", desc: "The platform routes the request to verified operators running that corridor. Operators with higher driver performance scores and lower incident rates receive first-allocation priority." }, { step: "03", title: "Confirmed via the Private Booking Ledger", desc: "Acceptance generates a confirmed entry on the shared booking ledger — visible to both sides, GPS-tracked via Live Pulse Map, and recorded for the full audit trail." }, { step: "04", title: "Revenue Settled on a Single Invoice", desc: "Enterprise clients receive consolidated billing. Operators receive payment directly. No informal arrangements, no reconciliation disputes." }] as item}
          <div class="pipeline-item">
            <div class="pipeline-step">{item.step}</div>
            <div>
              <div class="pipeline-title">{item.title}</div>
              <p class="pipeline-desc">{item.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- SACCO Enablement -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">SACCO Enablement Programme</span>
      <h2 class="section-title">
        What's Included in<br />Every Operator Account
      </h2>
      <p class="section-sub">
        The operator account is free to open. Revenue comes through enterprise
        bookings and data contribution to the network — not from subscription
        fees on the base account.
      </p>
      <div class="enable-grid">
        {#each [{ title: "Traffic Store Access", desc: "Query node saturation, Transfer Velocity, and corridor analytics across the Nairobi network.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` }, { title: "Route Revenue Dashboard", desc: "Historical yield data per route, peak-flow timing, and cost-per-kilometre benchmarks for your specific corridors.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` }, { title: "Private Booking Ledger", desc: "Full audit trail of every enterprise booking — accepted, in progress, and completed — with GPS tracking links per job.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` }, { title: "Driver Performance Records", desc: "Per-driver route adherence, idle time, trip completion rate, and incident log. Used to qualify vehicles for priority booking allocation.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` }, { title: "90-Minute Flow Forecasting", desc: "Predictive demand alerts for your active corridors — delivered as notifications before peak flow, not during it.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` }, { title: "Priority Booking Placement", desc: "Operators with verified accounts and strong performance records appear first in enterprise allocation queues — more demand, less competition.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` }] as e}
          <div class="enable-card">
            <div class="enable-icon">{@html e.icon}</div>
            <div>
              <div class="enable-title">{e.title}</div>
              <p class="enable-desc">{e.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Objection / differentiator -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Why It's Different</span>
      <h2 class="section-title">
        This Is Not a Tracking App.<br />It Is the Reservation Layer.
      </h2>
      <div class="diff-grid">
        {#each [{ before: "Informal phone bookings with no record", after: "Private ledger with GPS-tracked confirmation for every enterprise job" }, { before: "Staging decisions based on habit and experience", after: "Node Saturation and 90-minute flow forecasts per corridor" }, { before: "Generic traffic tools that show cars, not matatus", after: "H3-grid data specific to matatu nodes, dwell times, and discharge volumes" }, { before: "Revenue lost to unverified or poorly managed operators", after: "Performance scores that direct enterprise demand to your vehicles first" }] as d}
          <div class="diff-row">
            <div class="diff-before">
              <span class="diff-label before">Before</span>
              {d.before}
            </div>
            <div class="diff-arrow">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
              >
            </div>
            <div class="diff-after">
              <span class="diff-label after">With Matatu Pulse</span>
              {d.after}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Open Your <em>Operator Account.</em></h2>
      <p>
        Account setup takes less than a week. Start querying the Traffic Store
        on day one. Enterprise booking access follows once fleet verification is
        complete.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/contact_us" class="btn-teal">
          Open an Operator Account
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          >
        </a>
        <a href="/solutions/enterprise" class="btn-ghost"
          >Business Client Plans →</a
        >
      </div>
      <p class="final-note">
        Base operator accounts carry no subscription fee. Revenue is earned
        through enterprise bookings and data contribution to the network.
      </p>
    </div>
  </section>
</div>

<style>
  .page {
    background: var(--ink);
  }

  /* ── HERO ── */
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
      rgba(0, 176, 155, 0.1),
      transparent 60%
    );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 740px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    margin-bottom: 24px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
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
    color: var(--teal);
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

  /* ── BUTTONS ── */
  .btn-teal {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: var(--teal);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(0, 176, 155, 0.3);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .btn-teal:hover {
    background: #009b88;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 176, 155, 0.45);
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

  /* ── STATS ── */
  .stats-band {
    background: var(--ink-2);
    border-bottom: 1px solid var(--rim);
    padding: 48px 2rem;
  }
  .stats-inner {
    max-width: 900px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .stat {
    text-align: center;
    padding: 16px;
    border-right: 1px solid var(--rim);
  }
  .stat:last-child {
    border-right: none;
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 6px;
  }
  .stat-lbl {
    font-size: 0.72rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 500;
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
    color: var(--teal);
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.2);
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

  /* ── PILLARS ── */
  .pillars-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .pillar-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 32px 28px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .pillar-card:hover {
    border-color: rgba(0, 176, 155, 0.3);
    transform: translateY(-3px);
  }
  .pillar-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }
  .pillar-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    flex-shrink: 0;
  }
  .pillar-tag {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.15);
    padding: 3px 10px;
    border-radius: 100px;
  }
  .pillar-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }
  .pillar-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
  }

  /* ── TRAFFIC STORE ── */
  .store-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .store-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition: border-color 0.3s;
  }
  .store-card:hover {
    border-color: rgba(0, 176, 155, 0.25);
  }
  .store-metric {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--teal);
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }
  .store-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 16px;
  }
  .store-query {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.72rem;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.06);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 8px;
    padding: 7px 12px;
    letter-spacing: 0.02em;
  }

  /* ── PIPELINE ── */
  .pipeline-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .pipeline-item {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    padding: 32px 0;
    border-bottom: 1px solid var(--rim);
  }
  .pipeline-item:last-child {
    border-bottom: none;
  }
  .pipeline-step {
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 10px;
    padding: 8px 14px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .pipeline-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .pipeline-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 640px;
  }

  /* ── ENABLEMENT ── */
  .enable-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .enable-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: border-color 0.3s;
  }
  .enable-card:hover {
    border-color: rgba(0, 176, 155, 0.25);
  }
  .enable-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    flex-shrink: 0;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
  }
  .enable-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }
  .enable-desc {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── DIFFERENTIATOR ── */
  .diff-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 40px;
  }
  .diff-row {
    display: grid;
    grid-template-columns: 1fr 40px 1fr;
    gap: 20px;
    align-items: center;
    padding: 24px 0;
    border-bottom: 1px solid var(--rim);
  }
  .diff-row:last-child {
    border-bottom: none;
  }
  .diff-before,
  .diff-after {
    padding: 18px 20px;
    border-radius: 14px;
    font-size: 0.875rem;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .diff-before {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rim);
    color: var(--text-3);
  }
  .diff-after {
    background: rgba(0, 176, 155, 0.05);
    border: 1px solid rgba(0, 176, 155, 0.2);
    color: var(--text-2);
  }
  .diff-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .diff-label.before {
    color: var(--text-3);
  }
  .diff-label.after {
    color: var(--teal);
  }
  .diff-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    opacity: 0.5;
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
      rgba(0, 176, 155, 0.08),
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
    color: var(--teal);
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

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .stats-inner {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat:nth-child(2) {
      border-right: none;
    }
    .stat:nth-child(3) {
      border-right: 1px solid var(--rim);
    }
    .pillars-grid,
    .store-grid,
    .enable-grid {
      grid-template-columns: 1fr;
    }
    .diff-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .diff-arrow {
      transform: rotate(90deg);
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
