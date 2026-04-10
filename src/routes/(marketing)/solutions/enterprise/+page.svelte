<svelte:head>
  <title>For Organisations — Matatu Pulse | Fleet Intelligence & Transit Data for Nairobi Businesses</title>
  <meta
    name="description"
    content="Matatu Pulse gives corporate HR teams, logistics companies, event organisers, and retailers direct access to Nairobi's transit intelligence layer — fleet booking, corridor analytics, and real-time demand data."
  />
  <meta property="og:title" content="For Organisations — Matatu Pulse" />
  <meta
    property="og:description"
    content="Reserve fleet capacity, access the Traffic Store, and coordinate large-scale transit logistics across Nairobi. Built for corporate HR, events, logistics, and retail site selection."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">For Organisations</div>
      <h1>Extract Transit Data.<br /><em>Execute Logistics.</em><br />Model Growth.</h1>
      <p class="hero-sub">
        The intelligence layer between Nairobi's transit network and your
        business decisions. Reserve fleet capacity, query commuter movement
        data, and coordinate large-scale transit logistics — through one
        business account.
      </p>
      <div class="hero-actions">
        <a href="/contact_us" class="btn-blue">
          Open a Business Account
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </a>
        <a href="/docs" class="btn-ghost">View API Docs →</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <div class="stats-band">
    <div class="stats-inner">
      {#each [
        { val: "500+", lbl: "People via Single API Call" },
        { val: "18 mo", lbl: "Historical H3 Pattern Data" },
        { val: "90 min", lbl: "Before Peak Flow Forecasting" },
        { val: "1 ledger", lbl: "Auditable Booking Trail" }
      ] as s}
        <div class="stat">
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.lbl}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Who it's for -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Who It's For</span>
      <h2 class="section-title">Built for Four Distinct<br />Business Verticals</h2>
      <p class="section-sub">
        Each vertical has a different use case. The platform serves all four
        through a shared intelligence and reservation layer.
      </p>
      <div class="audience-grid">
        {#each [
          {
            title: "Corporate HR & Employee Mobility",
            desc: "Multinationals and large employers managing daily commuter transport for staff across Nairobi's network.",
            features: ["Pre-paid seat-block purchases", "Route usage reporting per employee", "Corporate invoicing with full audit trail", "Live Pulse Map for reserved vehicles"],
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`
          },
          {
            title: "Event Management & Logistics",
            desc: "Conference coordinators, venue operators, and event planners managing transit for 100–5,000+ attendees.",
            features: ["Fleet reservation for specific time-blocks", "Event Pulse Monitoring dashboard", "Real-time guest arrival flow tracking", "Temporary node deployment for large venues"],
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            title: "Retail & Site Selection",
            desc: "Retail chains, fuel companies, and independent retailers making location decisions based on commuter footfall data.",
            features: ["Node Saturation queries per terminus", "Walking-to-Waiting ratio at every node", "H3-grid footfall analysis", "Passenger discharge volume by time-of-day"],
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
          },
          {
            title: "Logistics & Supply Chain",
            desc: "Last-mile delivery companies, freight forwarders, and fuel supply chains modelling corridor costs and vehicle stress.",
            features: ["Corridor fuel-burn analytics", "Idling hotspot identification", "Operational cost vs. route revenue modelling", "Vehicle stress zone mapping"],
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
          }
        ] as a}
          <div class="audience-card">
            <div class="audience-icon">{@html a.icon}</div>
            <div class="audience-title">{a.title}</div>
            <p class="audience-desc">{a.desc}</p>
            <ul class="audience-list">
              {#each a.features as f}
                <li class="audience-li"><span class="dot"></span>{f}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Fleet intelligence features -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Fleet Intelligence</span>
      <h2 class="section-title">Real-Time Visibility into<br />Every Reserved Vehicle</h2>
      <p class="section-sub">
        When you book fleet capacity through the platform, you get full
        operational visibility — not just a booking confirmation.
      </p>
      <div class="cap-grid">
        {#each [
          {
            title: "Live Pulse Map",
            desc: "Real-time GPS tracking of every vehicle reserved for your booking. See exact positions, estimated arrival times, and route adherence — from a single dashboard across your entire reservation.",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>`
          },
          {
            title: "Demand Heatmaps",
            desc: "Passenger concentration data across your routes, updated in real time. Stage the right number of vehicles at the right locations — based on live demand, not assumption.",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
          },
          {
            title: "Delay & Deviation Alerts",
            desc: "Automatic notifications when a reserved vehicle goes off-route, stalls, or falls behind schedule. React in minutes — not when the driver eventually calls in.",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`
          },
          {
            title: "Trip Cycle Analytics",
            desc: "Full historical data on trip duration, idle time, load patterns, and turnaround efficiency for every booking you run. Use it to audit service quality and plan future reservations.",
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
          }
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

  <!-- Reservation engine -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Fleet Reservation Engine</span>
      <h2 class="section-title">Reserve Fleet Capacity<br />via a Private Booking Ledger</h2>
      <p class="section-sub">
        The reservation layer is proprietary to the platform. Bookings are
        managed via a private secure ledger — not informal phone arrangements
        with individual SACCO managers.
      </p>
      <div class="res-grid">
        {#each [
          {
            use: "Corporate Staff Transport",
            headline: "Pre-Paid Commuter Blocks",
            desc: "Purchase and assign seat-blocks for employees across the Nairobi network. Automated billing, route-usage reporting per staff member, and a full audit trail on a single corporate invoice.",
            cta: "See How It Works"
          },
          {
            use: "Events & Conferences",
            headline: "Time-Block Fleet Reservations",
            desc: "Reserve verified vehicles for a specific route, time-window, and headcount. Event Pulse Monitoring tracks guest arrival flow in real time so you can adjust fleet capacity before bottlenecks form.",
            cta: "Reserve Fleet for Your Event"
          },
          {
            use: "Logistics Operations",
            headline: "Corridor-Specific Capacity",
            desc: "Book vetted vehicles for defined corridors with full visibility into fuel-burn, idling patterns, and vehicle stress data. Model operational cost against real corridor conditions before committing.",
            cta: "Model Your Corridor"
          }
        ] as r}
          <div class="res-card">
            <div class="res-use">{r.use}</div>
            <div class="res-headline">{r.headline}</div>
            <p class="res-desc">{r.desc}</p>
            <a href="/contact_us" class="res-cta">{r.cta} →</a>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Traffic Store for orgs -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">The Traffic Store</span>
      <h2 class="section-title">Query the Intelligence Layer.<br />Make Decisions from Data.</h2>
      <p class="section-sub">
        The Traffic Store is not a heatmap. It is a searchable inventory of
        urban movement — queryable by node, corridor, time-of-day, and transfer
        pattern.
      </p>
      <div class="ts-grid">
        {#each [
          {
            vertical: "Retail & Energy",
            metric: "Node Saturation + Discharge Volumes",
            desc: "Know where thousands of commuters are discharged daily. Identify the exact point of maximum friction between transit and foot traffic — before competitors see it.",
            detail: "Filter by time-of-day. Compare Walking-to-Waiting ratios at every major node. Predictive modelling 90 minutes before peak flow."
          },
          {
            vertical: "Site Selection",
            metric: "Transfer Velocity + H3 Cell Intelligence",
            desc: "Analyse high-density commuter nodes using the H3 hexagonal grid. Identify where high-intent footfall is stagnant vs. passing through — and position accordingly.",
            detail: "Historical patterns from platform launch. ATM, kiosk, and advertising placement data. Conversion projections based on dwell time."
          },
          {
            vertical: "Logistics & Fuel",
            metric: "Corridor Analytics + Idling Hotspots",
            desc: "View fuel-burn and idling hotspots across the network. Optimise service station placement and fuel supply chain modelling against real vehicle stress zones.",
            detail: "High-acceleration corridors identified. Maintenance depot and rest stop siting data. Cost-per-kilometre benchmarking by route."
          },
          {
            vertical: "Municipal & Planning",
            metric: "Node Bottleneck Reporting",
            desc: "Real-time terminus congestion analysis with impact assessment on adjacent commercial zones. Data-backed infrastructure planning at the corridor level.",
            detail: "Route revenue potential analysis. Unit deployment optimisation. Network efficiency scoring for government planning tools."
          }
        ] as t}
          <div class="ts-card">
            <div class="ts-vertical">{t.vertical}</div>
            <div class="ts-metric">{t.metric}</div>
            <p class="ts-desc">{t.desc}</p>
            <p class="ts-detail">{t.detail}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Enterprise features -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Business Account Features</span>
      <h2 class="section-title">Everything in the Platform,<br />Structured for Organisations</h2>
      <p class="section-sub">
        The business account adds enterprise-grade infrastructure, dedicated
        support, and API access on top of the core reservation and intelligence
        products.
      </p>
      <div class="ent-grid">
        {#each [
          { title: "API & Data Access", desc: "Full programmatic access to live telemetry, historical trip data, node saturation feeds, and corridor analytics via REST and WebSocket APIs.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` },
          { title: "Dedicated SLA", desc: "99.5% uptime guarantee with a named technical contact and 4-hour response time for critical issues. Formal SLA documentation provided at contract signing.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
          { title: "Custom Integrations", desc: "We build and maintain integrations with your existing dispatch systems, ERP platforms, or government reporting infrastructure.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>` },
          { title: "Multi-Team Dashboard", desc: "Role-based access control for administrators, booking managers, and finance teams. Each team sees exactly what they need — nothing they don't.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
          { title: "Quarterly Business Reviews", desc: "Structured sessions with your account manager to review transit spend, fleet performance data, and usage trends. Identify optimisation opportunities before renewal.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
          { title: "Historical Data Licensing", desc: "Access archived H3 and corridor datasets dating to platform launch. Structured for research, audit, infrastructure planning, or competitive benchmarking.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` }
        ] as e}
          <div class="ent-card">
            <div class="ent-icon">{@html e.icon}</div>
            <div>
              <div class="ent-title">{e.title}</div>
              <p class="ent-desc">{e.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Account Tiers</span>
      <h2 class="section-title">Transparent Plans for<br />Every Organisation Size</h2>
      <p class="section-sub">
        Start with Traffic Store access. Add fleet reservations when ready.
        Scale to full API and custom integrations as your use case grows.
      </p>
      <div class="pricing-grid">
        {#each [
          {
            tier: "SMB",
            price: "KES 200K",
            per: "/year",
            desc: "For small businesses and startups beginning to use transit intelligence for location or logistics decisions.",
            featured: false,
            features: [
              "Traffic Store access (3 H3 cells free, then per-cell)",
              "Node Saturation & Transfer Velocity queries",
              "Fleet reservation (single bookings)",
              "Email support",
              "Self-service onboarding"
            ],
            cta: "Start Free Preview"
          },
          {
            tier: "Business",
            price: "KES 1–5M",
            per: "/year",
            desc: "For mid-market companies running regular fleet operations or making data-informed site and logistics decisions.",
            featured: true,
            features: [
              "Full Traffic Store access",
              "90-minute flow forecasting",
              "Fleet reservation (recurring time-blocks)",
              "Live Pulse Map & deviation alerts",
              "Pre-paid seat-block management",
              "Priority support (8hr response)",
              "Quarterly business review"
            ],
            cta: "Book a Demo"
          },
          {
            tier: "Enterprise",
            price: "Custom",
            per: "",
            desc: "For large organisations, government bodies, and institutions requiring API access, custom integrations, and SLA guarantees.",
            featured: false,
            features: [
              "Everything in Business",
              "API & data feed access",
              "Historical dataset licensing",
              "Custom integrations",
              "Dedicated account manager",
              "SLA guarantee (99.5% uptime)",
              "White-label options"
            ],
            cta: "Talk to Our Team"
          }
        ] as p}
          <div class="pricing-card {p.featured ? 'featured' : ''}">
            <div class="pricing-tier">{p.tier}</div>
            <div class="pricing-price">{p.price}<sub>{p.per}</sub></div>
            <p class="pricing-desc">{p.desc}</p>
            <div class="pricing-divider"></div>
            <ul class="pricing-features">
              {#each p.features as f}
                <li class="pricing-feature">
                  <span class="check-sm">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>{f}
                </li>
              {/each}
            </ul>
            <a href="/contact_us" class="pricing-btn">{p.cta}</a>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Final CTA -->
  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Your Competitors<br /><em>Don't Have This Data.</em></h2>
      <p>
        Book a 30-minute discovery call. We'll map your specific transit pain
        points to the platform's intelligence and reservation layer — and show
        you exactly what the data looks like for your routes and verticals.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/contact_us" class="btn-blue">
          Book a Discovery Call
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </a>
        <a href="/docs" class="btn-ghost">View API Docs →</a>
      </div>
      <p class="final-note">
        Setup takes 48 hours for standard business accounts. Full API access is
        available in week one. No long-term commitment required for the initial
        pilot.
      </p>
    </div>
  </section>
</div>

<style>
  /* ── BLUE ACCENT ── */
  :root {
    --blue: #3b82f6;
    --blue-dark: #2563eb;
    --blue-glow: rgba(59, 130, 246, 0.3);
    --blue-subtle: rgba(59, 130, 246, 0.08);
    --blue-border: rgba(59, 130, 246, 0.2);
  }

  .page { background: var(--ink); }

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
      rgba(59, 130, 246, 0.1),
      transparent 60%
    );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 760px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    margin-bottom: 24px;
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--blue);
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
    color: var(--blue);
  }
  .hero-sub {
    font-size: 1.1rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 600px;
    margin: 0 auto 40px;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

  /* ── BUTTONS ── */
  .btn-blue {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: var(--blue);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px var(--blue-glow);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-blue:hover {
    background: var(--blue-dark);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.45);
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
    transition: border-color 0.2s, color 0.2s, transform 0.15s;
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
  .stat:last-child { border-right: none; }
  .stat-val {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 800;
    color: var(--blue);
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
  .section { padding: 88px 2rem; }
  .section.alt {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    border-bottom: 1px solid var(--rim);
  }
  .inner { max-width: 1100px; margin: 0 auto; }

  .section-tag {
    display: inline-block;
    margin-bottom: 14px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--blue);
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
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

  /* ── AUDIENCE CARDS ── */
  .audience-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .audience-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 32px 28px;
    transition: border-color 0.3s, transform 0.3s;
  }
  .audience-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-3px);
  }
  .audience-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--blue);
    margin-bottom: 20px;
  }
  .audience-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .audience-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 20px;
  }
  .audience-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .audience-li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--blue);
    flex-shrink: 0;
    opacity: 0.6;
  }

  /* ── CAPABILITY CARDS (fleet intel) ── */
  .cap-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .cap-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 32px 28px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s, transform 0.3s;
  }
  .cap-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-3px);
  }
  .cap-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--blue);
    margin-bottom: 20px;
  }
  .cap-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }
  .cap-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
  }

  /* ── RESERVATION CARDS ── */
  .res-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .res-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 32px 26px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.3s, transform 0.3s;
  }
  .res-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-3px);
  }
  .res-use {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--blue);
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    padding: 3px 10px;
    border-radius: 100px;
    align-self: flex-start;
  }
  .res-headline {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-top: 4px;
  }
  .res-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
    flex: 1;
  }
  .res-cta {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--blue);
    text-decoration: none;
    margin-top: 4px;
    transition: opacity 0.2s;
  }
  .res-cta:hover { opacity: 0.75; }

  /* ── TRAFFIC STORE GRID ── */
  .ts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .ts-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition: border-color 0.3s;
  }
  .ts-card:hover { border-color: rgba(59, 130, 246, 0.25); }
  .ts-vertical {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--blue);
    margin-bottom: 8px;
  }
  .ts-metric {
    font-family: var(--font-display);
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }
  .ts-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 12px;
  }
  .ts-detail {
    font-size: 0.8rem;
    color: var(--text-3);
    line-height: 1.6;
    border-top: 1px solid var(--rim);
    padding-top: 12px;
  }

  /* ── ENTERPRISE FEATURES ── */
  .ent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ent-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: border-color 0.3s;
  }
  .ent-card:hover { border-color: var(--rim-2); }
  .ent-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    flex-shrink: 0;
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--blue);
  }
  .ent-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }
  .ent-desc {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── PRICING ── */
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .pricing-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 36px 28px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.3s, transform 0.3s;
  }
  .pricing-card.featured {
    border-color: rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.03);
    position: relative;
  }
  .pricing-card.featured::before {
    content: "Most Popular";
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 12px;
    background: var(--blue);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: 100px;
    white-space: nowrap;
  }
  .pricing-card:hover { transform: translateY(-3px); }
  .pricing-tier {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 12px;
  }
  .pricing-price {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-1);
    letter-spacing: -0.04em;
    margin-bottom: 4px;
    line-height: 1;
  }
  .pricing-price sub {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-3);
  }
  .pricing-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    margin-bottom: 28px;
    line-height: 1.5;
  }
  .pricing-divider {
    height: 1px;
    background: var(--rim);
    margin-bottom: 24px;
  }
  .pricing-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    margin-bottom: 28px;
  }
  .pricing-feature {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .check-sm {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    margin-top: 1px;
    background: var(--blue-subtle);
    border: 1px solid var(--blue-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--blue);
  }
  .pricing-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: var(--rim);
    color: var(--text-1);
    font-weight: 600;
    font-size: 0.875rem;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .pricing-btn:hover { background: var(--rim-2); }
  .pricing-card.featured .pricing-btn {
    background: var(--blue);
    color: #fff;
  }
  .pricing-card.featured .pricing-btn:hover { background: var(--blue-dark); }

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
      rgba(59, 130, 246, 0.08),
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
    color: var(--blue);
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
  @media (max-width: 1000px) {
    .res-grid { grid-template-columns: 1fr; }
    .pricing-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 900px) {
    .stats-inner { grid-template-columns: repeat(2, 1fr); }
    .stat:nth-child(2) { border-right: none; }
    .stat:nth-child(3) { border-right: 1px solid var(--rim); }
    .audience-grid,
    .cap-grid,
    .ts-grid,
    .ent-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .hero { padding: 72px 1.25rem 64px; }
    .section { padding: 64px 1.25rem; }
  }
</style>