<svelte:head>
  <title
    >Enterprise Transit Solutions — Matatu Pulse | Large-Scale Fleet
    Intelligence Nairobi</title
  >
  <meta
    name="description"
    content="Matatu Pulse Enterprise delivers custom fleet integrations, dedicated support, SLA guarantees, and city-scale transit data for large saccos, county governments, and transport authorities in Kenya."
  />
  <meta property="og:title" content="Enterprise — Matatu Pulse" />
  <meta
    property="og:description"
    content="City-scale matatu fleet intelligence. Custom integrations, SLA guarantees, and dedicated support for large operators and transport authorities."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Enterprise</div>
      <h1>Transit Intelligence<br />at <em>City Scale</em></h1>
      <p class="hero-sub">
        Custom integrations, dedicated support, SLA guarantees, and aggregated
        mobility data for large saccos, county governments, and transport
        authorities managing Nairobi's transit network.
      </p>
      <div class="hero-actions">
        <a href="/contact_us" class="btn-primary"
          >Talk to Our Team<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/docs" class="btn-ghost">View API Docs →</a>
      </div>
    </div>
  </section>

  <!-- Who it's for -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Who It's For</span>
      <h2 class="section-title">Built for Organisations That Move the City</h2>
      <p class="section-sub">
        Enterprise is designed for three distinct stakeholders — each with
        different needs but a shared interest in smarter urban mobility.
      </p>
      <div class="audience-grid">
        {#each [{ title: "Large Saccos & Fleet Groups", desc: "Managing 50+ vehicles across multiple routes demands tooling beyond a standard operator dashboard.", features: ["Multi-route unified fleet view", "Cross-sacco vehicle sharing tools", "Custom reporting & data exports", "Dedicated account manager"], icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` }, { title: "County Governments", desc: "Data-driven transit planning requires aggregated, anonymised mobility intelligence at the route and corridor level.", features: ["Corridor congestion analytics", "Route coverage gap identification", "Rider volume trend reporting", "GIS data export for planning tools"], icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` }, { title: "Transport Authorities & NGOs", desc: "Research institutions, transport regulators, and development partners need structured access to Nairobi's mobility data layer.", features: ["API access to telemetry feeds", "Historical dataset licensing", "Custom data partnerships", "Co-research programme access"], icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }] as a}
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

  <!-- Enterprise features -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Enterprise Features</span>
      <h2 class="section-title">Everything in Operator, Plus</h2>
      <p class="section-sub">
        Enterprise builds on the full operator platform with additional
        infrastructure, support, and integration capabilities.
      </p>
      <div class="ent-grid">
        {#each [{ title: "Dedicated SLA", desc: "99.5% uptime guarantee with a named technical contact and 4-hour response time for critical issues.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` }, { title: "API & Data Access", desc: "Full programmatic access to live telemetry, historical trip data, and route performance feeds via our REST and WebSocket APIs.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>` }, { title: "Custom Integrations", desc: "We build and maintain integrations with your existing dispatch systems, ERP, or government reporting platforms.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>` }, { title: "Multi-Organisation Dashboard", desc: "A unified view across multiple saccos or subsidiaries, with role-based access control for administrators, managers, and dispatchers.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` }, { title: "Quarterly Business Reviews", desc: "Structured sessions with your account manager to review fleet performance trends, identify optimisation opportunities, and plan roadmap priorities.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }, { title: "White-Label Options", desc: "Deploy Matatu Pulse's tracking and alert infrastructure under your own brand for county-wide or sacco-branded rider applications.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` }] as e}
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
  <section class="section">
    <div class="inner">
      <span class="section-tag">Pricing</span>
      <h2 class="section-title">Transparent Plans for Every Scale</h2>
      <p class="section-sub">
        Start with the operator plan and upgrade as your fleet grows. No hidden
        fees, no per-vehicle surprise charges at renewal.
      </p>
      <div class="pricing-grid">
        {#each [{ tier: "Operator", price: "KES 4,500", per: "/month", desc: "For individual operators and small saccos with up to 15 vehicles.", featured: false, features: ["Up to 15 tracked vehicles", "Live fleet map", "Delay & deviation alerts", "Basic trip analytics", "Email support"], cta: "Get Started" }, { tier: "Sacco", price: "KES 14,000", per: "/month", desc: "For established saccos managing 16–80 vehicles across multiple routes.", featured: true, features: ["Up to 80 tracked vehicles", "Everything in Operator", "Demand heatmaps", "Advanced analytics dashboard", "Route performance reports", "Priority support (8hr response)"], cta: "Start Pilot" }, { tier: "Enterprise", price: "Custom", per: "", desc: "For large fleets, county governments, and transport authorities.", featured: false, features: ["Unlimited vehicles", "Everything in Sacco", "API & data access", "Custom integrations", "SLA guarantee", "Dedicated account manager", "White-label option"], cta: "Talk to Us" }] as p}
          <div class="pricing-card {p.featured ? 'featured' : ''}">
            <div class="pricing-tier">{p.tier}</div>
            <div class="pricing-price">{p.price}<sub>{p.per}</sub></div>
            <p class="pricing-desc">{p.desc}</p>
            <div class="pricing-divider"></div>
            <ul class="pricing-features">
              {#each p.features as f}
                <li class="pricing-feature">
                  <span class="check-sm"
                    ><svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg
                    ></span
                  >{f}
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
      <h2>Let's Build Nairobi's<br /><em>Mobility Future Together</em></h2>
      <p>
        Whether you're managing 20 vehicles or 2,000, our team will design a
        deployment that fits your organisation, your routes, and your budget.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/contact_us" class="btn-primary"
          >Schedule a Call<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/docs" class="btn-ghost">View API Docs →</a>
      </div>
      <p class="final-note">
        Typical enterprise onboarding takes 5–10 business days from contract
        signing.
      </p>
    </div>
  </section>
</div>

<style>
  .page {
    background: var(--ink);
  }

  .hero {
    padding: 108px 2rem 96px;
    text-align: center;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 40% 55% at 20% 50%,
        rgba(242, 101, 34, 0.07),
        transparent 60%
      ),
      radial-gradient(
        ellipse 40% 55% at 80% 50%,
        rgba(0, 176, 155, 0.07),
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
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--rim-2);
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-2);
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
    max-width: 600px;
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

  /* ── AUDIENCE CARDS ── */
  .audience-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .audience-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 32px 28px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .audience-card:hover {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateY(-3px);
  }
  .audience-icon {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
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
    background: var(--orange);
    flex-shrink: 0;
    opacity: 0.6;
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
    padding: 30px 26px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: border-color 0.3s;
  }
  .ent-card:hover {
    border-color: var(--rim-2);
  }
  .ent-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    flex-shrink: 0;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
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

  /* ── PRICING CARDS ── */
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
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .pricing-card.featured {
    border-color: rgba(242, 101, 34, 0.35);
    background: rgba(242, 101, 34, 0.03);
    position: relative;
  }
  .pricing-card.featured::before {
    content: "Most Popular";
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 12px;
    background: var(--orange);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: 100px;
    white-space: nowrap;
  }
  .pricing-card:hover {
    transform: translateY(-3px);
  }
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
    background: rgba(242, 101, 34, 0.12);
    border: 1px solid rgba(242, 101, 34, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
  }
  .pricing-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--rim);
    color: var(--text-1);
    font-weight: 600;
    font-size: 0.875rem;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .pricing-btn:hover {
    background: var(--rim-2);
  }
  .pricing-card.featured .pricing-btn {
    background: var(--orange);
    color: #fff;
  }
  .pricing-card.featured .pricing-btn:hover {
    background: #d95618;
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
      rgba(242, 101, 34, 0.08),
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

  @media (max-width: 1024px) {
    .pricing-grid {
      grid-template-columns: 1fr 1fr;
    }
    .pricing-card.featured {
      order: -1;
      grid-column: span 2;
    }
  }
  @media (max-width: 900px) {
    .audience-grid {
      grid-template-columns: 1fr;
    }
    .ent-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 640px) {
    .pricing-grid {
      grid-template-columns: 1fr;
    }
    .pricing-card.featured {
      grid-column: span 1;
      order: 0;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
    .section {
      padding: 64px 1.25rem;
    }
  }
</style>
