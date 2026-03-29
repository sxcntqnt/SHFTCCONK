<svelte:head>
  <title>About Us — Matatu Pulse | Building Smarter Transit for Nairobi</title>
  <meta
    name="description"
    content="Matatu Pulse is a Nairobi-based transit technology company building real-time tracking and fleet intelligence for Kenya's matatu network. Learn our story, mission, and team."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">About Us</div>
      <h1>We're Building Nairobi's<br /><em>Transit Nervous System</em></h1>
      <p class="hero-sub">
        Matatu Pulse is a Nairobi-based technology company on a mission to make
        Kenya's matatu network as legible, predictable, and efficient as the
        best transit systems in the world.
      </p>
    </div>
  </section>

  <!-- Mission -->
  <section class="section">
    <div class="inner">
      <div class="mission-split">
        <div class="mission-text">
          <span class="section-tag">Our Mission</span>
          <h2>Public Transport Should Work for <em>Everyone</em></h2>
          <p>
            Nairobi's matatu network is one of Africa's great informal-economy
            success stories — responsive, affordable, and deeply woven into the
            city's fabric. But for the five million people who rely on it daily,
            it has always been unpredictable.
          </p>
          <p>
            We exist to change that. By connecting GPS hardware, real-time data
            infrastructure, and rider-facing tools into a single platform, we
            give every stakeholder in the matatu ecosystem — riders, drivers,
            operators, saccos, and planners — the information they need to make
            better decisions.
          </p>
          <p>
            Predictable transit isn't a luxury. It's an equity issue. When
            workers can't plan their commute reliably, they build in buffers
            that cost them time they don't have. We're removing that tax.
          </p>
        </div>
        <div class="mission-visual">
          <div class="mission-stat-grid">
            {#each [{ val: "60k+", lbl: "Daily Riders" }, { val: "340+", lbl: "Vehicles Tracked" }, { val: "12", lbl: "Sacco Partners" }, { val: "9 min", lbl: "Avg Wait Saved" }] as s}
              <div class="m-stat">
                <div class="m-stat-val">{s.val}</div>
                <div class="m-stat-lbl">{s.lbl}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Story -->
  <section class="section alt">
    <div class="inner-narrow">
      <span class="section-tag">Our Story</span>
      <h2 class="section-title">Started at a Stage on Ngong Road</h2>
      <div class="story-body">
        <p>
          The idea for Matatu Pulse was born out of personal frustration. Our
          founder spent 45 minutes waiting at a stage in Kilimani on a Tuesday
          morning in 2022, watching packed matatus roll past while an empty one
          never came. There was no way to know whether to keep waiting, walk, or
          find an alternative. The information simply didn't exist.
        </p>
        <p>
          That experience wasn't unusual — it was the daily reality for millions
          of Nairobi commuters. But what made it interesting as a problem was
          the solution's feasibility. GPS hardware was cheap. Mobile data
          infrastructure was good enough. The data, if collected, could be
          valuable to multiple stakeholders simultaneously.
        </p>
        <div class="story-pullquote">
          "The matatu network isn't broken. It's just invisible. Make it visible
          and it starts working better for everyone."
        </div>
        <h3>The First Pilot</h3>
        <p>
          We started in 2023 with six vehicles from a single sacco partner on
          one route. We built the minimum viable tracking infrastructure,
          shipped a basic web interface, and watched whether riders actually
          changed their behaviour when given live information. They did —
          immediately and measurably.
        </p>
        <p>
          Within three months we had 12 partner vehicles and a waiting list of
          saccos wanting to join. Within six months we had cleared 100 vehicles
          across three routes and raised a seed round from East African
          institutional investors who understood the scale of the opportunity.
        </p>
        <h3>Where We Are Now</h3>
        <p>
          Today Matatu Pulse tracks over 340 vehicles across 12 partner saccos,
          serving more than 60,000 daily active riders. We're the leading
          real-time matatu tracking platform in Nairobi, and we're building the
          data layer that will eventually make Kenya's entire informal transit
          network legible — to the people who ride it, the operators who run it,
          and the planners who shape it.
        </p>
      </div>
    </div>
  </section>

  <!-- Values -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">What We Believe</span>
      <h2 class="section-title">The Values That Drive Every Decision</h2>
      <div class="values-grid" style="margin-top:48px;">
        {#each [{ n: "01", title: "Data Honesty", desc: "We only show information we can verify. An inaccurate ETA is worse than no ETA. We'd rather display uncertainty than false confidence." }, { n: "02", title: "Rider First", desc: "Every product decision is evaluated against a simple test: does this make the daily commuter's life better? Features that only serve business metrics don't ship." }, { n: "03", title: "Operator Partnership", desc: "Saccos aren't obstacles to work around. They're the network. Our best product insights come from deep collaboration with the operators who run Nairobi's matatus daily." }, { n: "04", title: "Infrastructure Humility", desc: "We build for 3G. We design for older Android devices. We assume patchy connections and low storage. If it doesn't work at the edge, it doesn't work." }, { n: "05", title: "Open Data Ethos", desc: "Anonymised, aggregated mobility data belongs to the city that generates it. We publish public datasets and work with research institutions and county governments." }, { n: "06", title: "Long Game", desc: "Informal transit systems have been evolving for decades. Changing them for the better takes patience, local knowledge, and genuine relationships — not just good software." }] as v}
          <div class="value-card">
            <div class="value-num">{v.n}</div>
            <div class="value-title">{v.title}</div>
            <p class="value-desc">{v.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Team -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">The Team</span>
      <h2 class="section-title">Built by People Who Know Nairobi</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;max-width:540px;margin-bottom:48px;"
      >
        We're a small, senior team — most of us daily matatu riders ourselves.
        No one here needs to be explained the problem we're solving.
      </p>
      <div class="team-grid">
        {#each [{ name: "Amara Odhiambo", role: "Co-founder & CEO", bio: "Former transport economist at the World Bank Kenya office. Daily commuter on Route 46 for six years.", init: "AO" }, { name: "Brian Kamau", role: "Co-founder & CTO", bio: "Previously led data infrastructure at a Nairobi fintech. Built the first GPS prototype on a Matatu in 2022.", init: "BK" }, { name: "Wanjiru Muthee", role: "Head of Operator Partnerships", bio: "10 years in sacco management consulting. Knows every major sacco chairman in Nairobi personally.", init: "WM" }, { name: "Daniel Achieng", role: "Lead Engineer", bio: "Backend systems specialist. Designed the telemetry pipeline that handles 10M+ GPS points daily.", init: "DA" }, { name: "Fatuma Hassan", role: "Product Design", bio: "UX researcher turned product designer. Led user research with 200+ Nairobi commuters in 2023.", init: "FH" }, { name: "Peter Njoroge", role: "Data Science", bio: "MSc Transport Engineering, University of Nairobi. Leads our ETA modelling and congestion research.", init: "PN" }, { name: "Grace Akinyi", role: "Head of Growth", bio: "Previously at Safaricom's M-PESA team. Knows how to build trust-based products for the Kenyan mass market.", init: "GA" }, { name: "James Mutua", role: "Operations", bio: "Manages our hardware deployment and GPS tracker maintenance across all 12 partner sacco fleets.", init: "JM" }] as t}
          <div class="team-card">
            <div class="team-avatar">{t.init}</div>
            <div class="team-name">{t.name}</div>
            <div class="team-role">{t.role}</div>
            <p class="team-bio">{t.bio}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Timeline -->
  <section class="section">
    <div class="inner" style="max-width:720px;">
      <span class="section-tag">Milestones</span>
      <h2 class="section-title" style="margin-bottom:48px;">How We Got Here</h2>
      <div class="timeline">
        {#each [{ year: "Q1 2023", title: "First GPS tracker installed", desc: "Six vehicles, one route, one sacco. A basic web interface that showed real-time positions to anyone with the link." }, { year: "Q3 2023", title: "100 vehicles and a seed round", desc: "Cleared 100 tracked vehicles across three routes. Raised seed funding from East African institutional investors to accelerate hardware deployment." }, { year: "Q4 2023", title: "Arrival alerts launched", desc: "Shipped push notification infrastructure. Riders began receiving 2-minute alerts. Average stage waiting time dropped 9 minutes per trip in post-launch surveys." }, { year: "Q1 2024", title: "Operator dashboard beta", desc: "Released the first version of the operator-facing fleet dashboard to our six most active sacco partners. Supermetro pilot showed 23% delay reduction on Route 46." }, { year: "Q3 2024", title: "API launched", desc: "Opened developer API access to live telemetry and historical trip data. First external integrations built by county transport planning teams." }, { year: "Q1 2025", title: "300+ vehicles, 12 saccos", desc: "Passed 300 tracked vehicles. Expanded to 12 partner saccos. Launched fare estimates feature based on sacco-reported rate data." }, { year: "Now", title: "60,000+ daily active riders", desc: "Serving over 60,000 daily active riders across Nairobi's major corridors. Building multi-hop trip planning and the enterprise tier." }] as m}
          <div class="timeline-item">
            <div class="timeline-dot">{m.year.slice(0, 2)}</div>
            <div class="timeline-content">
              <div class="timeline-year">{m.year}</div>
              <div class="timeline-title">{m.title}</div>
              <p class="timeline-desc">{m.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-inner">
      <h2>Join Us in Building<br /><em>Nairobi's Mobility Future</em></h2>
      <p>
        Whether you're a commuter, a sacco manager, a developer, or a city
        planner — there's a place for you in what we're building.
      </p>
      <div class="cta-row">
        <a href="/careers" class="btn-primary"
          >See Open Roles<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/contact_us" class="btn-ghost">Get in Touch →</a>
      </div>
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
    background:
      radial-gradient(
        ellipse 50% 60% at 20% 60%,
        rgba(242, 101, 34, 0.07),
        transparent 55%
      ),
      radial-gradient(
        ellipse 50% 60% at 80% 40%,
        rgba(0, 176, 155, 0.06),
        transparent 55%
      );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 760px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-block;
    margin-bottom: 24px;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    background: var(--rim);
    border: 1px solid var(--rim-2);
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
    max-width: 620px;
    margin: 0 auto;
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
  .inner-narrow {
    max-width: 720px;
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

  /* ── MISSION SPLIT ── */
  .mission-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .mission-text h2 {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-bottom: 20px;
  }
  .mission-text h2 em {
    font-style: normal;
    color: var(--orange);
  }
  .mission-text p {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.8;
    margin-bottom: 18px;
  }
  .mission-visual {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 24px;
    padding: 40px;
    position: relative;
    overflow: hidden;
  }
  .mission-visual::before {
    content: "";
    position: absolute;
    top: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.12),
      transparent 70%
    );
  }
  .mission-stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .m-stat {
    background: var(--ink-2);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 20px 18px;
  }
  .m-stat-val {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--orange);
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 4px;
  }
  .m-stat-lbl {
    font-size: 0.75rem;
    color: var(--text-3);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── STORY ── */
  .story-body {
    font-size: 1.05rem;
    color: var(--text-2);
    line-height: 1.85;
  }
  .story-body p {
    margin-bottom: 20px;
  }
  .story-body h3 {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-1);
    letter-spacing: -0.02em;
    margin: 36px 0 14px;
  }
  .story-pullquote {
    border-left: 3px solid var(--orange);
    padding: 6px 0 6px 24px;
    margin: 32px 0;
    font-size: 1.15rem;
    font-style: italic;
    color: var(--text-1);
    line-height: 1.6;
  }

  /* ── VALUES ── */
  .values-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .value-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .value-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .value-num {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 800;
    color: rgba(242, 101, 34, 0.2);
    letter-spacing: -0.05em;
    line-height: 1;
    margin-bottom: 14px;
  }
  .value-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .value-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── TEAM ── */
  .team-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .team-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 20px;
    text-align: center;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .team-card:hover {
    border-color: rgba(242, 101, 34, 0.25);
    transform: translateY(-3px);
  }
  .team-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    color: #fff;
  }
  .team-name {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .team-role {
    font-size: 0.78rem;
    color: var(--text-3);
    margin-bottom: 12px;
  }
  .team-bio {
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* ── TIMELINE ── */
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }
  .timeline::before {
    content: "";
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg, var(--orange), rgba(242, 101, 34, 0.1));
  }
  .timeline-item {
    display: flex;
    gap: 32px;
    padding-bottom: 40px;
  }
  .timeline-item:last-child {
    padding-bottom: 0;
  }
  .timeline-dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--ink-2);
    border: 2px solid var(--orange);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--orange);
    position: relative;
    z-index: 1;
  }
  .timeline-content {
    padding-top: 8px;
  }
  .timeline-year {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--orange);
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .timeline-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }
  .timeline-desc {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── CTA ── */
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
  .final-inner {
    position: relative;
    max-width: 580px;
    margin: 0 auto;
  }
  .final-inner h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .final-inner h2 em {
    font-style: normal;
    color: var(--orange);
  }
  .final-inner p {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 36px;
  }
  .cta-row {
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
      transform 0.15s;
  }
  .btn-primary:hover {
    background: #d95618;
    transform: translateY(-2px);
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

  @media (max-width: 900px) {
    .mission-split {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .values-grid {
      grid-template-columns: 1fr 1fr;
    }
    .team-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .values-grid {
      grid-template-columns: 1fr;
    }
    .team-grid {
      grid-template-columns: 1fr 1fr;
    }
    .section {
      padding: 64px 1.25rem;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
  }
</style>
