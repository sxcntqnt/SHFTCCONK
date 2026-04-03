<svelte:head>
  <title>Help Centre — Matatu Pulse | Support for Riders & Operators</title>
  <meta
    name="description"
    content="Find answers to common questions about Matatu Pulse — tracking, arrival alerts, route coverage, account settings, operator dashboards, and technical issues. Nairobi matatu tracking support."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Help Centre</div>
      <h1>How Can We<br /><em>Help You?</em></h1>
      <p class="hero-sub">
        Answers for riders, operators, and developers. Search below or browse by
        category.
      </p>
      <div class="search-wrap">
        <span class="search-icon"
          ><svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><circle cx="11" cy="11" r="8" /><line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            /></svg
          ></span
        >
        <input
          class="search-input"
          type="search"
          placeholder="Search help articles — e.g. 'arrival alert', 'GPS tracking'"
        />
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="section">
    <div class="inner">
      <div class="status-banner">
        <div class="status-dot"></div>
        <p class="status-text">
          All systems operational — <strong
            >API, live tracking, and alerts running normally</strong
          >
        </p>
        <a href="/docs/status" class="status-link">View Status Page →</a>
      </div>

      <span class="section-tag">Browse by Topic</span>
      <h2 class="section-title" style="margin-bottom:40px;">
        What Do You Need Help With?
      </h2>
      <div class="cat-grid">
        {#each [{ title: "Getting Started", count: "8 articles", desc: "Download the app, create an account, and find your first route. Start here if you're new.", href: "/help/getting-started", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>` }, { title: "Live Tracking", count: "12 articles", desc: "How GPS tracking works, what to do when a vehicle isn't showing, and coverage questions.", href: "/help/tracking", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>` }, { title: "Arrival Alerts", count: "9 articles", desc: "Setting up alerts, fixing notifications that aren't arriving, and alert timing calibration.", href: "/help/alerts", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>` }, { title: "Route Planner", count: "7 articles", desc: "Comparing routes, multi-hop trips, ETA accuracy questions, and missing route requests.", href: "/help/routes", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }, { title: "Operator Dashboard", count: "15 articles", desc: "Fleet map setup, reading analytics, delay alerts, user management, and billing for operators.", href: "/help/operators", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` }, { title: "Account & Billing", count: "11 articles", desc: "Manage your subscription, update payment details, download invoices, and change your plan.", href: "/help/account", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` }] as c}
          <a href={c.href} class="cat-card">
            <div class="cat-icon">{@html c.icon}</div>
            <div class="cat-title">{c.title}</div>
            <div class="cat-count">{c.count}</div>
            <p class="cat-desc">{c.desc}</p>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <!-- FAQs -->
  <section class="section alt">
    <div class="inner-narrow">
      <span class="section-tag">Common Questions</span>
      <h2 class="section-title" style="margin-bottom:44px;">
        Frequently Asked Questions
      </h2>

      {#each [{ group: "For Riders", tag: "Riders", faqs: [{ q: "Why isn't my route showing any vehicles?", a: "This usually means no GPS-equipped vehicles are currently active on that route. Coverage depends on our sacco partner network — not all vehicles on every route carry trackers yet. Check back during peak hours when more vehicles are typically active. You can request route coverage via the in-app form." }, { q: "How accurate are the arrival alerts?", a: "On most routes, alerts are accurate to within ±2 minutes. The model factors in live vehicle speed, current congestion, and time-of-day historical patterns. During heavy peak traffic — particularly on Thika Road and Ngong Road between 5–7pm — variance increases. We're continuously improving accuracy as we accumulate more trip data per route." }, { q: "Can I use Matatu Pulse without downloading the app?", a: "Yes. The full commuter experience — live map, ETA comparison, and route information — is available at <a href='/app/dashboard'>matatupulse.co.ke/app</a> in your mobile browser. No download or account needed. Push notifications require the app." }, { q: "Does the app work when I have no data connection?", a: "Core map tiles and route information are cached locally after your first visit. You can view static route data offline. Live vehicle positions and ETAs require a data connection — even EDGE (2G) is sufficient." }, { q: "How do I report a wrong fare or a route that's changed?", a: "Use the 'Report an issue' button on any route or vehicle card in the app. Your report is reviewed by our data team within 24 hours and corrections are applied to the platform." }] }, { group: "For Operators", tag: "Operators", faqs: [{ q: "How do I add vehicles to my fleet dashboard?", a: "New vehicles are added via your operator account under Fleet → Add Vehicle. You'll need the vehicle registration plate and GPS unit serial number. Our hardware team will confirm activation within one business day. Contact ops@matatupulse.co.ke if you need GPS units supplied." }, { q: "My vehicle is showing the wrong position on the map. What do I do?", a: "GPS position errors are usually caused by poor satellite lock in dense urban areas or GPS unit power issues. First, check that the vehicle's GPS unit is powered and the indicator light is solid green. If the issue persists beyond 30 minutes, submit a support ticket through your operator dashboard with the vehicle ID." }, { q: "Can I give my dispatcher access without giving them full account admin rights?", a: "Yes. The operator dashboard supports role-based access. Go to Settings → Team and invite your dispatcher with the 'Dispatcher' role — they'll have access to the live fleet map and delay alerts but not billing or account settings." }, { q: "How do I download my fleet analytics as a CSV?", a: "From your operator dashboard, go to Analytics → any report → Export. You can export daily, weekly, or monthly trip data as CSV or Excel. Enterprise customers can also access raw data via the API." }, { q: "What happens if a GPS unit is damaged or stolen?", a: "Report lost or damaged hardware immediately to ops@matatupulse.co.ke. We'll deactivate the unit to prevent phantom tracking data. Replacement units are shipped within 2 business days for active partners. Hardware damage beyond normal wear is billed at cost." }] }] as section}
        <div class="faq-group">
          <div class="faq-group-title">
            {section.group} <span>{section.tag}</span>
          </div>
          <div class="faq-list">
            {#each section.faqs as f}
              <div class="faq-item">
                <button class="faq-q">
                  {f.q}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg
                  >
                </button>
                <p class="faq-a">{@html f.a}</p>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Contact options -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Still Need Help?</span>
      <h2 class="section-title" style="margin-bottom:40px;">
        Reach Our Support Team
      </h2>
      <div class="contact-grid">
        {#each [{ title: "Email Support", desc: "For account issues, billing questions, and anything that needs a detailed response from our team.", cta: "support@matatupulse.co.ke", href: "mailto:support@matatupulse.co.ke", response: "Typically within 4 hours", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` }, { title: "Community Forum", desc: "Ask the Matatu Pulse rider and operator community. Often the fastest way to get a real-world answer.", cta: "Visit the Forum →", href: "/community", response: "Community response in minutes", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }, { title: "Operator Hotline", desc: "Active partner saccos with urgent fleet or hardware issues can reach our operations team directly.", cta: "+254 700 000 000", href: "tel:+254700000000", response: "Available 6am–10pm EAT", icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.41-1.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>` }] as c}
          <a href={c.href} class="contact-card">
            <div class="contact-card-icon">{@html c.icon}</div>
            <div class="contact-card-title">{c.title}</div>
            <p class="contact-card-desc">{c.desc}</p>
            <div class="contact-card-cta">{c.cta}</div>
            <div class="response-time">{c.response}</div>
          </a>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  .page {
    background: var(--ink);
  }

  /* ── HERO ── */
  .hero {
    padding: 88px 2rem 72px;
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
      rgba(242, 101, 34, 0.1),
      transparent 60%
    );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-block;
    margin-bottom: 22px;
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
    font-size: clamp(2rem, 5vw, 3.2rem);
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
    max-width: 500px;
    margin: 0 auto 32px;
  }

  .search-wrap {
    max-width: 480px;
    margin: 0 auto;
    position: relative;
  }
  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-3);
  }
  .search-input {
    width: 100%;
    padding: 13px 16px 13px 44px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    border-radius: 14px;
    font-size: 0.9rem;
    color: var(--text-1);
    font-family: var(--font-body);
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  .search-input:focus {
    border-color: rgba(242, 101, 34, 0.45);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }
  .search-input::placeholder {
    color: var(--text-3);
  }

  .section {
    padding: 80px 2rem;
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
    max-width: 800px;
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
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 12px;
  }

  /* ── CATEGORY CARDS ── */
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .cat-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    text-decoration: none;
    display: block;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .cat-card:hover {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateY(-3px);
  }
  .cat-icon {
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
  .cat-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }
  .cat-count {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-bottom: 10px;
  }
  .cat-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* ── FAQ SECTIONS ── */
  .faq-group {
    margin-bottom: 48px;
  }
  .faq-group:last-child {
    margin-bottom: 0;
  }
  .faq-group-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .faq-group-title span {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    padding: 2px 9px;
    border-radius: 100px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .faq-item {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 12px;
    overflow: hidden;
  }
  .faq-q {
    width: 100%;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
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
  .faq-q svg {
    flex-shrink: 0;
    color: var(--text-3);
  }
  .faq-a {
    padding: 0 22px 18px;
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.75;
  }
  .faq-a a {
    color: var(--orange);
    text-decoration: none;
  }
  .faq-a a:hover {
    text-decoration: underline;
  }

  /* ── STATUS BANNER ── */
  .status-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: center;
    padding: 12px 24px;
    background: rgba(0, 176, 155, 0.07);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 12px;
    margin-bottom: 48px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--teal);
    box-shadow: 0 0 8px rgba(0, 176, 155, 0.6);
  }
  .status-text {
    font-size: 0.875rem;
    color: var(--text-2);
  }
  .status-text strong {
    color: var(--teal);
  }
  .status-link {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .status-link:hover {
    color: var(--teal);
  }

  /* ── CONTACT OPTIONS ── */
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .contact-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
    text-align: center;
    text-decoration: none;
    display: block;
    transition:
      border-color 0.3s,
      transform 0.3s;
  }
  .contact-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateY(-3px);
  }
  .contact-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 13px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin: 0 auto 18px;
  }
  .contact-card-title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }
  .contact-card-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.6;
    margin-bottom: 14px;
  }
  .contact-card-cta {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--orange);
  }
  .response-time {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 4px;
  }

  @media (max-width: 900px) {
    .cat-grid {
      grid-template-columns: 1fr 1fr;
    }
    .contact-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .cat-grid {
      grid-template-columns: 1fr;
    }
    .contact-grid {
      grid-template-columns: 1fr;
    }
    .section {
      padding: 56px 1.25rem;
    }
    .hero {
      padding: 64px 1.25rem 56px;
    }
  }
</style>
