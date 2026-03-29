<svelte:head>
  <title
    >Careers — Matatu Pulse | Join the Team Building Nairobi's Transit Future</title
  >
  <meta
    name="description"
    content="Join Matatu Pulse in Nairobi. We're hiring engineers, designers, data scientists, and operators passionate about transforming urban mobility in Kenya."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Careers</div>
      <h1>Work on a Problem That<br /><em>Moves Millions of People</em></h1>
      <p class="hero-sub">
        We're a small team building critical infrastructure for one of Africa's
        largest cities. If you want your work to matter every single day, we
        should talk.
      </p>
    </div>
  </section>

  <!-- Perks -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Why Matatu Pulse</span>
      <h2 class="section-title">Built for People Who Build Things</h2>
      <p class="section-sub">
        We keep the team small and the ownership high. Everyone here has a
        direct line to the product and the users.
      </p>
      <div class="perks-grid">
        {#each [{ title: "Real Impact, Daily", desc: "Our platform affects 60,000+ commuters every day. When you ship something, you see the effect in rider data within 24 hours.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }, { title: "Competitive Nairobi Salary", desc: "We pay at the top of the Nairobi market for senior roles. We don't compensate in equity instead of salary — you get both.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` }, { title: "Equity That Means Something", desc: "Everyone on the team holds meaningful equity in a company that's growing fast and operating in a market with real network effects.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>` }, { title: "Remote-Flexible", desc: "We're based in Nairobi but don't require daily office attendance for most roles. Two team days per week, the rest is yours to choose.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>` }, { title: "Learning Budget", desc: "KES 120,000 per year for courses, conferences, books, and certifications. We invest in making you better because it makes the product better.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>` }, { title: "Health Cover", desc: "Comprehensive NHIF top-up health insurance for you and your dependants. We take care of people who take care of the product.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` }] as p}
          <div class="perk-card">
            <div class="perk-icon">{@html p.icon}</div>
            <div class="perk-title">{p.title}</div>
            <p class="perk-desc">{p.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Open roles -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Open Roles</span>
      <h2 class="section-title">Where We're Hiring Now</h2>
      <p class="section-sub" style="margin-bottom:40px;">
        We're a lean team and only open roles when we have genuine capacity to
        onboard and a clear need. These are live positions.
      </p>

      <div class="roles-list">
        {#each [{ dept: "Engineering", title: "Senior Backend Engineer", meta: "Full-time · Nairobi (Hybrid) · Competitive", tags: ["Elixir / Go", "PostgreSQL", "Real-time systems"] }, { dept: "Engineering", title: "Mobile Engineer (Android)", meta: "Full-time · Nairobi (Hybrid) · Competitive", tags: ["Kotlin", "Jetpack Compose", "Offline-first"] }, { dept: "Data", title: "Data Engineer", meta: "Full-time · Nairobi (Remote-OK) · Competitive", tags: ["Python", "dbt", "GPS telemetry"] }, { dept: "Product", title: "Product Manager — Rider Experience", meta: "Full-time · Nairobi (Hybrid) · Competitive", tags: ["Consumer mobile", "User research", "Kenya market"] }, { dept: "Partnerships", title: "Sacco Partnerships Associate", meta: "Full-time · Nairobi (Field + Office) · Competitive", tags: ["Matatu industry", "Relationship management", "KiSwahili fluent"] }] as r}
          <a
            href="/contact_us?role={encodeURIComponent(r.title)}"
            class="role-card"
          >
            <div class="role-left">
              <div class="role-dept">{r.dept}</div>
              <div class="role-title">{r.title}</div>
              <div class="role-meta">{r.meta}</div>
              <div class="role-tags">
                {#each r.tags as t}<span class="role-tag">{t}</span>{/each}
              </div>
            </div>
            <div class="role-arrow">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
              >
            </div>
          </a>
        {/each}

        <div class="no-role">
          <h3>Don't See Your Role?</h3>
          <p>
            We hire for character and capability as much as specific titles. If
            you're exceptional at something that could help us build smarter
            transit in Nairobi, we want to hear from you.
          </p>
          <a
            href="/contact_us"
            style="display:inline-flex;align-items:center;gap:8px;padding:11px 24px;background:var(--rim);border:1px solid var(--rim-2);border-radius:100px;font-size:0.875rem;font-weight:600;color:var(--text-2);text-decoration:none;"
            >Send a General Application →</a
          >
        </div>
      </div>
    </div>
  </section>

  <!-- Process -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Hiring Process</span>
      <h2 class="section-title">What to Expect</h2>
      <p class="section-sub" style="margin-bottom:52px;">
        We keep our process short and respectful of your time. Most candidates
        go from application to offer in under three weeks.
      </p>
      <div class="process-steps">
        {#each [{ n: "01", title: "Application Review", desc: "We read every application personally. You'll hear back within 5 business days — no ghosting." }, { n: "02", title: "Intro Call (30 min)", desc: "A relaxed conversation about your background, what you're looking for, and whether there's a fit." }, { n: "03", title: "Technical / Skills Interview", desc: "Role-specific. Engineers do a realistic take-home task (paid). Non-technical roles do a case discussion." }, { n: "04", title: "Team Interview & Offer", desc: "Meet two or three team members. If it's a match, we move fast — typically an offer within 48 hours." }] as p}
          <div class="proc-step">
            <div class="proc-num">{p.n}</div>
            <div class="proc-title">{p.title}</div>
            <p class="proc-desc">{p.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-inner">
      <h2>Ready to Build Something<br /><em>That Matters?</em></h2>
      <p>
        Send us your CV and a short note about what excites you about the
        problem we're solving. That's all we need to start.
      </p>
      <a href="/contact_us" class="btn-primary"
        >Apply Now<svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
        ></a
      >
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
    max-width: 720px;
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

  /* ── PERKS ── */
  .perks-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .perk-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .perk-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .perk-icon {
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
  .perk-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .perk-desc {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── ROLES ── */
  .roles-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .role-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 24px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    text-decoration: none;
    transition:
      border-color 0.3s,
      transform 0.2s;
  }
  .role-card:hover {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateX(4px);
  }
  .role-left {
    flex: 1;
  }
  .role-dept {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 6px;
  }
  .role-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .role-meta {
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .role-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .role-tag {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    background: var(--rim);
    color: var(--text-3);
    border: 1px solid var(--rim-2);
  }
  .role-arrow {
    color: var(--text-3);
    flex-shrink: 0;
    transition:
      color 0.2s,
      transform 0.2s;
  }
  .role-card:hover .role-arrow {
    color: var(--orange);
    transform: translateX(4px);
  }

  .no-role {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 48px;
    text-align: center;
  }
  .no-role h3 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .no-role p {
    font-size: 0.9rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 440px;
    margin: 0 auto 24px;
  }

  /* ── PROCESS ── */
  .process-steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    position: relative;
  }
  .process-steps::before {
    content: "";
    position: absolute;
    top: 32px;
    left: calc(12.5% + 1px);
    right: calc(12.5% + 1px);
    height: 1px;
    background: linear-gradient(90deg, var(--orange), rgba(242, 101, 34, 0.15));
  }
  .proc-step {
    padding: 32px 20px;
    position: relative;
    z-index: 1;
    text-align: center;
  }
  .proc-num {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--rim-2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--orange);
    transition: border-color 0.3s;
  }
  .proc-step:hover .proc-num {
    border-color: var(--orange);
  }
  .proc-title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .proc-desc {
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.6;
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
      rgba(242, 101, 34, 0.1),
      transparent 60%
    );
    pointer-events: none;
  }
  .final-inner {
    position: relative;
    max-width: 560px;
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

  @media (max-width: 1024px) {
    .process-steps {
      grid-template-columns: 1fr 1fr;
    }
    .process-steps::before {
      display: none;
    }
  }
  @media (max-width: 900px) {
    .perks-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .perks-grid {
      grid-template-columns: 1fr;
    }
    .section {
      padding: 64px 1.25rem;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
    .role-card {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
