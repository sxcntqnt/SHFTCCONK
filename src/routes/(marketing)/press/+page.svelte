<svelte:head>
  <title>Press — Matatu Pulse | Media Resources & Press Kit</title>
  <meta
    name="description"
    content="Press resources for Matatu Pulse — company facts, leadership bios, brand assets, coverage guidelines, and media contact for journalists covering urban mobility and transit technology in Kenya."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Press & Media</div>
      <h1>Resources for<br /><em>Journalists & Researchers</em></h1>
      <p class="hero-sub">
        Everything you need to cover Matatu Pulse accurately — company facts,
        brand assets, spokespeople, and media guidelines. We respond to all
        press enquiries within 4 hours on business days.
      </p>
      <a href="mailto:press@matatupulse.co.ke" class="press-contact-pill">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          color="var(--orange)"
          ><path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
          /><polyline points="22,6 12,13 2,6" /></svg
        >
        <span>Press enquiries: <strong>press@matatupulse.co.ke</strong></span>
      </a>
    </div>
  </section>

  <!-- Boilerplate -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Company Boilerplate</span>
      <h2 class="section-title">Standard Description for Publication</h2>
      <div class="boilerplate">
        <div class="boilerplate-label">Short (50 words)</div>
        <p class="boilerplate-text">
          Matatu Pulse is a Nairobi-based transit technology company building
          real-time GPS tracking and fleet intelligence for Kenya's matatu
          network. The platform serves over 60,000 daily riders and 12 partner
          saccos, providing live vehicle positions, arrival predictions, and
          operational analytics across Nairobi's major commuter corridors.
        </p>
        <button
          class="copy-btn"
          onclick={() => {
            const text =
              this.closest(".boilerplate").querySelector(
                ".boilerplate-text",
              ).textContent
            navigator.clipboard.writeText(text)
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy text
        </button>
      </div>
    </div>
  </section>

  <!-- Key facts -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Key Facts</span>
      <h2 class="section-title">Company Data Points</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;margin-bottom:40px;max-width:540px;"
      >
        Verified figures as of Q1 2025. For the most current data or to request
        a custom data briefing, contact press@matatupulse.co.ke.
      </p>
      <div class="facts-grid">
        {#each [{ label: "Founded", value: "2023, Nairobi, Kenya" }, { label: "Daily Active Riders", value: "60,000+" }, { label: "Tracked Vehicles", value: "340+" }, { label: "Partner Saccos", value: "12" }, { label: "Routes Covered", value: "Major Nairobi corridors" }, { label: "Average Wait Saved", value: "9 minutes per trip" }, { label: "Funding Stage", value: "Seed round (2023)" }, { label: "Team Size", value: "28 full-time" }, { label: "Headquarters", value: "Westlands, Nairobi" }] as f}
          <div class="fact-card">
            <div class="fact-label">{f.label}</div>
            <div class="fact-value">{f.value}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Media coverage -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">In the News</span>
      <h2 class="section-title">Recent Coverage</h2>
      <div class="coverage-list" style="margin-top:40px;">
        {#each [{ pub: "Business Daily Africa", headline: "Matatu Pulse tracks 340 vehicles in Nairobi, saving commuters nearly 10 minutes daily", date: "Feb 2025" }, { pub: "TechCabal", headline: "The Nairobi startup quietly building a real-time data layer for informal transit", date: "Jan 2025" }, { pub: "The Standard", headline: "How GPS technology is changing the daily matatu commute in Nairobi", date: "Nov 2024" }, { pub: "Nation Africa", headline: "Sacco managers say fleet tracking cuts delays, improves daily trip counts", date: "Sep 2024" }, { pub: "Quartz Africa", headline: "Nairobi's matatu network is getting smarter — one GPS tracker at a time", date: "Jul 2024" }] as c}
          <div class="coverage-item">
            <div class="coverage-pub">{c.pub}</div>
            <div class="coverage-headline">{c.headline}</div>
            <div class="coverage-date">{c.date}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Brand assets -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Brand Assets</span>
      <h2 class="section-title">Logos & Brand Materials</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;margin-bottom:40px;max-width:540px;"
      >
        Please use only the approved logo files below. Do not alter colours,
        proportions, or typography. Full brand guidelines available on request.
      </p>
      <div class="assets-grid">
        {#each [{ name: "Logo — Dark Background", format: "SVG, PNG", preview: "dark", label: "MatPulse" }, { name: "Logo — Light Background", format: "SVG, PNG", preview: "light", label: "MatPulse" }, { name: "Logo Mark Only", format: "SVG, PNG, ICO", preview: "dark", label: "M↗" }, { name: "Orange on Dark", format: "SVG, PNG", preview: "dark", label: "MATU" }, { name: "Wordmark — Horizontal", format: "SVG, PNG", preview: "dark", label: "Matatu Pulse" }, { name: "Press Photo Pack", format: "ZIP (6 images)", preview: "dark", label: "📸" }] as a}
          <div class="asset-card">
            <div class="asset-preview {a.preview}">{a.label}</div>
            <div class="asset-body">
              <div class="asset-name">{a.name}</div>
              <div class="asset-format">{a.format}</div>
              <a href="/press/assets" class="asset-dl">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  ><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline
                    points="7 10 12 15 17 10"
                  /><line x1="12" y1="15" x2="12" y2="3" /></svg
                >
                Download
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Spokespeople -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Spokespeople</span>
      <h2 class="section-title">Available for Interview</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;margin-bottom:40px;max-width:540px;"
      >
        Our founders and heads of department are available for comment,
        interviews, and data briefings. Arrange via press@matatupulse.co.ke.
      </p>
      <div class="spokes-grid">
        {#each [{ name: "Amara Odhiambo", role: "Co-founder & CEO", bio: "Speaks on informal transit economics, Kenya mobility policy, urban tech entrepreneurship, and the business of matatu saccos.", init: "AO", topics: ["Urban mobility", "Nairobi transit policy", "Startup building", "East Africa tech"] }, { name: "Brian Kamau", role: "Co-founder & CTO", bio: "Speaks on GPS telemetry infrastructure, building for low-bandwidth environments, transit data systems, and engineering in Kenya.", init: "BK", topics: ["Real-time systems", "GPS tech", "Africa engineering", "Open transit data"] }, { name: "Peter Njoroge", role: "Data Science Lead", bio: "Available for data-driven briefings on Nairobi traffic patterns, matatu network efficiency, and ETA modelling methodology.", init: "PN", topics: ["Traffic data", "ETA modelling", "Network efficiency", "Transport research"] }, { name: "Wanjiru Muthee", role: "Head of Partnerships", bio: "Deep expertise on sacco structure, informal transport operators, and the economic dynamics of Nairobi's matatu industry.", init: "WM", topics: ["Sacco economics", "Operator dynamics", "Informal transit", "Kenya transport"] }] as s}
          <div class="spoke-card">
            <div class="spoke-avatar">{s.init}</div>
            <div>
              <div class="spoke-name">{s.name}</div>
              <div class="spoke-role">{s.role}</div>
              <p class="spoke-bio">{s.bio}</p>
              <div class="spoke-topics">
                {#each s.topics as t}<span class="spoke-topic">{t}</span>{/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Guidelines -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Usage Guidelines</span>
      <h2 class="section-title">How to Cover Us Accurately</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;margin-bottom:48px;max-width:540px;"
      >
        We welcome media coverage and aim to be a helpful, responsive source.
        These guidelines help ensure accuracy.
      </p>
      <div class="guidelines-cols">
        <div class="guideline-group">
          <h4><span class="do">✓</span> Please Do</h4>
          <ul class="guideline-list">
            {#each ["Refer to us as 'Matatu Pulse' (two words, both capitalised)", "Describe the matatu network as 'informal' or 'privately-operated' rather than 'unregulated'", "Use only logos from our official press kit", "Contact us before publication to verify any data or statistics", "Credit rider and operator quotes as provided by Matatu Pulse", "Describe our product as a 'real-time matatu tracking platform' on first reference"] as g}
              <li class="guideline-li">
                <span class="gl-check gl-do">✓</span>{g}
              </li>
            {/each}
          </ul>
        </div>
        <div class="guideline-group">
          <h4><span class="dont">✕</span> Please Don't</h4>
          <ul class="guideline-list">
            {#each ["Use 'MatatuPulse' (one word) or abbreviate to 'MP'", "Reproduce or modify logos outside the provided files", "Attribute statements to us without a confirmed quote from our press team", "Describe us as a 'matatu app' — we are a platform serving riders, operators, and planners", "Use rider names or photos from our platform without explicit permission", "Publish forward-looking product claims from investor materials as confirmed fact"] as g}
              <li class="guideline-li">
                <span class="gl-check gl-dont">✕</span>{g}
              </li>
            {/each}
          </ul>
        </div>
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
    background: radial-gradient(
      ellipse 55% 65% at 50% -5%,
      rgba(242, 101, 34, 0.11),
      transparent 60%
    );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 680px;
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
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.22);
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5.5vw, 3.6rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 18px;
  }
  h1 em {
    font-style: normal;
    color: var(--orange);
  }
  .hero-sub {
    font-size: 1.05rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 520px;
    margin: 0 auto 32px;
  }
  .press-contact-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    border-radius: 100px;
    text-decoration: none;
    transition: border-color 0.2s;
  }
  .press-contact-pill:hover {
    border-color: rgba(242, 101, 34, 0.3);
  }
  .press-contact-pill span {
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .press-contact-pill strong {
    color: var(--orange);
    font-weight: 600;
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

  /* ── BOILERPLATE ── */
  .boilerplate {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 36px 32px;
    position: relative;
    overflow: hidden;
  }
  .boilerplate::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--rim-2), transparent);
  }
  .boilerplate-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 16px;
  }
  .boilerplate-text {
    font-size: 0.95rem;
    color: var(--text-2);
    line-height: 1.8;
    margin-bottom: 20px;
  }
  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    background: var(--rim);
    border: 1px solid var(--rim-2);
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
  }
  .copy-btn:hover {
    background: var(--rim-2);
    color: var(--text-1);
  }

  /* ── FACTS ── */
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .fact-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 24px 20px;
  }
  .fact-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .fact-value {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1.4;
  }

  /* ── COVERAGE ── */
  .coverage-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .coverage-item {
    display: flex;
    align-items: center;
    gap: 20px;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 20px 24px;
    transition: border-color 0.3s;
  }
  .coverage-item:hover {
    border-color: var(--rim-2);
  }
  .coverage-pub {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    min-width: 160px;
    flex-shrink: 0;
  }
  .coverage-headline {
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.5;
    flex: 1;
  }
  .coverage-date {
    font-size: 0.72rem;
    color: var(--text-3);
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* ── ASSETS ── */
  .assets-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .asset-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .asset-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .asset-preview {
    height: 120px;
    background: var(--ink-3);
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--rim);
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    color: rgba(242, 101, 34, 0.4);
    letter-spacing: -0.04em;
  }
  .asset-preview.dark {
    background: var(--ink);
  }
  .asset-preview.light {
    background: #f5f5f0;
    color: rgba(242, 101, 34, 0.6);
  }
  .asset-body {
    padding: 18px 18px;
  }
  .asset-name {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .asset-format {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-bottom: 12px;
  }
  .asset-dl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--orange);
    text-decoration: none;
  }
  .asset-dl:hover {
    text-decoration: underline;
  }

  /* ── SPOKESPEOPLE ── */
  .spokes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .spoke-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .spoke-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }
  .spoke-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 2px;
  }
  .spoke-role {
    font-size: 0.78rem;
    color: var(--orange);
    font-weight: 600;
    margin-bottom: 10px;
  }
  .spoke-bio {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
    margin-bottom: 12px;
  }
  .spoke-topics {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .spoke-topic {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    background: var(--rim);
    color: var(--text-3);
    border: 1px solid var(--rim-2);
  }

  /* ── GUIDELINES ── */
  .guidelines-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .guideline-group h4 {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .do {
    color: var(--teal);
  }
  .dont {
    color: #f87171;
  }
  .guideline-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .guideline-li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.6;
  }
  .gl-check {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    font-size: 0.6rem;
    font-weight: 800;
  }
  .gl-do {
    background: rgba(0, 176, 155, 0.12);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.3);
  }
  .gl-dont {
    background: rgba(248, 113, 113, 0.12);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.3);
  }

  @media (max-width: 900px) {
    .facts-grid {
      grid-template-columns: 1fr 1fr;
    }
    .assets-grid {
      grid-template-columns: 1fr 1fr;
    }
    .spokes-grid {
      grid-template-columns: 1fr;
    }
    .guidelines-cols {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    .facts-grid {
      grid-template-columns: 1fr 1fr;
    }
    .assets-grid {
      grid-template-columns: 1fr;
    }
    .coverage-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .section {
      padding: 64px 1.25rem;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
  }
</style>
