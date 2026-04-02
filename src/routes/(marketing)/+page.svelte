<script lang="ts">
  import { onMount } from "svelte"
  import {
    WebsiteName,
    WebsiteBaseUrl,
    WebsiteDescription,
  } from "./../../config"
  import type {
    MatatuPartner,
    Testimonial,
    PlatformCapability,
    CommuterWorkflow,
    PlatformActor,
    IconKey,
  } from "./../../lib/types"

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: WebsiteName,
    url: WebsiteBaseUrl,
  }
  const jsonldScript = `<script type="application/ld+json">${JSON.stringify(ldJson) + "<"}/script>`

  const ICONS: Record<IconKey, string> = {
    tracking: "/icons/marker.png",
    routes: "/icons/out.png",
    notifications: "/icons/star.png",
    analytics: "/icons/point.png",
  }

  export const MATATU_PARTNERS: readonly MatatuPartner[] = [
    { name: "SUPERMETRO", logo: "vehicles/ptrns/super-metro.svg" },
    { name: "NICCO", logo: "vehicles/ptrns/nicco-sacco.svg" },
    { name: "RONGAO", logo: "vehicles/ptrns/rongao-sacco.svg" },
    { name: "BURUSACCO", logo: "vehicles/ptrns/buru-sacco.svg" },
    { name: "UMOINNER", logo: "vehicles/ptrns/umoinner.svg" },
    { name: "FORWARD", logo: "vehicles/ptrns/forward-sacco.svg" },
  ]

  export const PLATFORM_CAPABILITIES: readonly PlatformCapability[] = [
    {
      name: "Live Vehicle Telemetry",
      description:
        "Continuous GPS streaming from installed trackers provides second-level vehicle position accuracy.",
      icon: "tracking",
      image: "vehicles/features/tracking.png",
      audience: ["Commuter", "Operator"],
    },
    {
      name: "Dynamic Route Intelligence",
      description:
        "Routes adapt using congestion patterns and historical trip duration modeling.",
      icon: "routes",
      image: "vehicles/features/routes.png",
      audience: ["Commuter", "Operator", "Planner"],
    },
    {
      name: "Passenger Event Alerts",
      description:
        "Arrival prediction, delays, diversions, and approaching vehicle notifications.",
      icon: "notifications",
      image: "vehicles/features/notifications.png",
      audience: ["Commuter"],
    },
    {
      name: "Fleet Performance Analytics",
      description:
        "Trip cycles, idle time detection, load balancing, and revenue opportunity identification.",
      icon: "analytics",
      image: "vehicles/features/analytics.png",
      audience: ["Operator", "Sacco"],
    },
  ]

  export const COMMUTER_WORKFLOWS: readonly CommuterWorkflow[] = [
    {
      icon: "tracking",
      title: "Locate a Matatu",
      description:
        "Select a route and instantly see nearby vehicles approaching your stage.",
      link: "/product/features",
    },
    {
      icon: "routes",
      title: "Choose the Fastest Trip",
      description: "Compare ETAs across routes and avoid congestion delays.",
      link: "/routes",
    },
    {
      icon: "notifications",
      title: "Receive Arrival Alerts",
      description: "Get notified when your vehicle is approaching your stop.",
      link: "/notifications",
    },
  ]

  export const TESTIMONIALS: readonly Testimonial[] = [
    {
      name: "John Mwangi",
      userType: "Commuter",
      testimony:
        "I no longer wait blindly at the stage. I leave only when the matatu is close.",
      rating: 5,
    },
    {
      name: "Grace Wanjiku",
      userType: "Operator",
      testimony:
        "We can now see delays immediately and redirect vehicles accordingly.",
      rating: 4,
    },
    {
      name: "Peter Kamau",
      userType: "Commuter",
      testimony: "Arrival prediction completely changed my morning routine.",
      rating: 5,
    },
    {
      name: "Mary Achieng",
      userType: "Commuter",
      testimony: "Notifications help me plan transfers without stress.",
      rating: 4,
    },
    {
      name: "David Otieno",
      userType: "Fleet Owner",
      testimony: "We identified idle vehicles and increased daily trips.",
      rating: 5,
    },
    {
      name: "Sarah Njeri",
      userType: "Commuter",
      testimony: "Fastest route suggestions save me a lot of time every week.",
      rating: 4,
    },
    {
      name: "James Njoroge",
      userType: "Commuter",
      testimony: "The system makes commuting predictable for the first time.",
      rating: 5,
    },
    {
      name: "Esther Muthoni",
      userType: "Operator",
      testimony: "Passengers complain less because they already know delays.",
      rating: 4,
    },
    {
      name: "Michael Omondi",
      userType: "Commuter",
      testimony: "Finally public transport behaves like a modern system.",
      rating: 5,
    },
  ]

  const allTestimonials = TESTIMONIALS
  const partners = MATATU_PARTNERS
  const commuterWorkflows = COMMUTER_WORKFLOWS
  const platformCapabilities = PLATFORM_CAPABILITIES
  const commuterFeatures = platformCapabilities.filter((f) =>
    f.audience.includes("Commuter"),
  )

  const STATS = [
    { value: "60k+", label: "Daily Riders" },
    { value: "12", label: "Sacco Partners" },
    { value: "340+", label: "Vehicles Tracked" },
    { value: "2 min", label: "Avg Alert Lead Time" },
  ]

  const steps = ["01", "02", "03"]

  /* ── City rotator state ── */
  const cities = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Malindi",
  ]
  let cityIndex = 0
  let cityFading = false

  const GREENS = ["#00ff88", "#00ffaa", "#33ff99", "#00ffcc"]
  let dotColor = GREENS[0]

  onMount(() => {
    const interval = setInterval(() => {
      cityFading = true
      setTimeout(() => {
        cityIndex = (cityIndex + 1) % cities.length
        dotColor = GREENS[Math.floor(Math.random() * GREENS.length)]
        cityFading = false
      }, 500)
    }, 9000)
    return () => clearInterval(interval)
  })
</script>

<svelte:head>
  <title>{WebsiteName} – Never Wait Again</title>
  <meta
    name="description"
    content="Live matatu tracking in Nairobi. See real-time positions, accurate ETAs and get 2–3 min arrival alerts. Free for commuters."
  />
  {@html jsonldScript}
</svelte:head>

<!-- ═══════════ HERO ═══════════ -->
<section class="hero">
  <video autoplay muted loop playsinline>
    <source src="/vehicles/custom/GenjeSana.mp4" type="video/mp4" />
  </video>
  <div class="hero-overlay"></div>

  <div class="hero-inner">
    <!-- Live city beacon -->
    <div class="hero-eyebrow">
      <span
        class="hero-eyebrow-dot"
        style="background:{dotColor}; box-shadow:0 0 8px {dotColor}, 0 0 20px {dotColor}44;"
      ></span>
      <span class="eyebrow-label">Now Live in</span>
      <span class="dynamic-city" class:city-exit={cityFading}>
        {cities[cityIndex]}
      </span>
    </div>

    <h1>Never Wait Blindly<br />at the Stage <em>Again</em></h1>

    <p class="hero-sub">
      See exactly where your matatu is right now. Get precise ETAs and alerts
      when it's 2–3 minutes away — for free.
    </p>

    <div class="hero-actions">
      <a href="/download" class="btn-hero-primary">
        Get the App — Free
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
      <a href="/product/routes" class="btn-hero-secondary">
        Try Live Route Manager →
      </a>
    </div>

    <p class="hero-note">
      Already helping thousands of Nairobi commuters save time every day
    </p>
  </div>
</section>

<!-- ═══════════ STATS ═══════════ -->
<div class="stats-strip">
  <div class="stats-inner">
    {#each STATS as stat}
      <div class="stat-item">
        <div class="stat-value">{stat.value}</div>
        <div class="stat-label">{stat.label}</div>
      </div>
    {/each}
  </div>
</div>

<!-- ═══════════ PARTNERS ═══════════ -->
<section class="partners">
  <div class="partners-inner">
    <p class="partners-label">Trusted by Nairobi's leading matatu saccos</p>
    <div class="partners-logos">
      {#each partners as p}
        <img src={p.logo} alt={p.name} class="partner-logo" />
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════ HOW IT WORKS ═══════════ -->
<section class="how-it-works">
  <div class="how-inner">
    <div class="section-header">
      <span class="section-eyebrow">How It Works</span>
      <h2 class="section-title">Get Where You're Going Faster</h2>
      <p class="section-sub">
        Three simple steps from uncertainty to a predictable, stress-free
        commute.
      </p>
    </div>

    <div class="steps-grid">
      {#each commuterWorkflows as step, i}
        {@const Icon = ICONS[step.icon]}
        <div class="step-card">
          <div class="step-num">Step {steps[i]}</div>
          <div class="step-icon-ring">
            <img src={Icon} alt={step.title} />
          </div>
          <div class="step-title">{step.title}</div>
          <p class="step-desc">{step.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════ FEATURES ═══════════ -->
<section class="features">
  <div class="features-inner">
    <div class="section-header">
      <span class="section-eyebrow">Platform Capabilities</span>
      <h2 class="section-title">Built for Everyday Commuters</h2>
      <p class="section-sub">
        Everything you need to reclaim your time — from live tracking to smart
        route comparison.
      </p>
    </div>

    <div class="features-grid">
      {#each commuterFeatures as feature}
        {@const Icon = ICONS[feature.icon]}
        <div class="feature-card">
          <div class="feature-icon">
            <img src={Icon} alt={feature.name} />
          </div>
          <div class="feature-name">{feature.name}</div>
          <p class="feature-desc">{feature.description}</p>
          <div class="feature-audience">
            {#each feature.audience as a}
              <span class="audience-tag">{a}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════ TESTIMONIALS ═══════════ -->
<section class="testimonials">
  <div class="testimonials-inner">
    <div class="section-header">
      <span class="section-eyebrow">Real Riders</span>
      <h2 class="section-title">Nairobi Commuters Love It</h2>
      <p class="section-sub">
        From daily riders to fleet managers — hear what the people using it
        every day have to say.
      </p>
    </div>

    <div class="testimonials-grid">
      {#each allTestimonials as t}
        <div class="testimonial-card" class:featured={t.rating === 5}>
          <div class="stars">
            {#each Array(5) as _, i}
              <span class="star" class:empty={i >= t.rating}>★</span>
            {/each}
          </div>
          <p class="testimonial-text">"{t.testimony}"</p>
          <div class="testimonial-meta">
            <div class="testimonial-avatar">{t.name.charAt(0)}</div>
            <div>
              <div class="testimonial-name">{t.name}</div>
              <div class="testimonial-type">{t.userType}</div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ═══════════ OPERATOR CALLOUT ═══════════ -->
<section class="operator-callout">
  <div class="operator-inner">
    <div class="operator-content">
      <span class="operator-label">For Operators</span>
      <h2>Running a Sacco or Fleet?</h2>
      <p>
        Get real-time fleet intelligence — track every vehicle, spot delays
        before passengers do, and unlock revenue insights you didn't know were
        hiding in your routes.
      </p>
      <ul class="operator-benefits">
        {#each ["Real-time vehicle positions across your entire fleet", "Delay alerts and route deviation notifications", "Driver behavior monitoring and compliance tools", "Trip cycle analytics and revenue opportunity reports"] as benefit}
          <li class="operator-benefit">
            <span class="benefit-check">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            {benefit}
          </li>
        {/each}
      </ul>
      <a href="/contact_us" class="btn-teal">
        Request a Demo
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
    </div>

    <div class="operator-visual">
      <div class="op-glow"></div>
      <div class="op-stat-grid">
        {#each [{ val: "18%", lbl: "More Trips Per Day" }, { val: "34%", lbl: "Reduced Idle Time" }, { val: "2.4×", lbl: "Faster Incident Response" }, { val: "91%", lbl: "Operator Satisfaction" }] as s}
          <div class="op-stat">
            <div class="op-stat-val">{s.val}</div>
            <div class="op-stat-lbl">{s.lbl}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ FINAL CTA ═══════════ -->
<section class="final-cta">
  <div class="final-cta-inner">
    <h2>Ready to Make Every<br />Commute <em>Predictable?</em></h2>
    <p>
      Download the app and take back control of your time. Live tracking,
      arrival alerts, and route optimization — all free for riders.
    </p>
    <div class="final-cta-actions">
      <a href="/download" class="btn-hero-primary">
        Get the App — Free
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
      <a href="/contact_us" class="btn-hero-secondary">Operator Demo →</a>
    </div>
    <p class="final-note">
      Register for an account to start tracking. Instant access.
    </p>
  </div>
</section>

<style>
  /* ════════════════════════════════════════
     BORDER BEAM — must live at top level
  ════════════════════════════════════════ */
  @property --beam-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }

  @keyframes beam-spin {
    to {
      --beam-angle: 360deg;
    }
  }

  @keyframes pulse-dot {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.45);
      opacity: 1;
    }
  }

  @keyframes city-enter {
    from {
      opacity: 0;
      transform: translateY(7px) scale(0.95);
      filter: blur(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes float-up {
    from {
      opacity: 0;
      transform: translateY(28px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ════════════════════════════════════════
     HERO
  ════════════════════════════════════════ */
  .hero {
    position: relative;
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .hero video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    will-change: transform;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        to bottom,
        rgba(10, 10, 12, 0.2) 0%,
        rgba(10, 10, 12, 0.6) 55%,
        rgba(10, 10, 12, 1) 100%
      ),
      linear-gradient(130deg, rgba(242, 101, 34, 0.22) 0%, transparent 50%);
  }
  .hero-inner {
    position: relative;
    z-index: 10;
    max-width: 900px;
    margin: 0 auto;
    padding: 120px 2rem 100px;
    text-align: center;
    animation: float-up 0.9s cubic-bezier(0.23, 1, 0.32, 1) both;
  }

  /* ── Eyebrow beacon ── */
  .hero-eyebrow {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 9px 20px;
    margin-bottom: 36px;
    background: rgba(10, 10, 14, 0.82);
    border-radius: 100px;
    backdrop-filter: blur(12px);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    isolation: isolate;
  }

  /* Static base border */
  .hero-eyebrow::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(242, 101, 34, 0.22);
    pointer-events: none;
  }

  /* Travelling green light */
  .hero-eyebrow::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(
      from var(--beam-angle),
      transparent 0deg,
      transparent 290deg,
      rgba(0, 255, 136, 0.08) 320deg,
      rgba(0, 255, 170, 0.85) 348deg,
      rgba(200, 255, 230, 1) 354deg,
      rgba(0, 255, 170, 0.85) 360deg,
      transparent 360deg
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: beam-spin 3.8s linear infinite;
    pointer-events: none;
  }

  .hero-eyebrow-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #00ff88;
    box-shadow:
      0 0 8px #00ff88,
      0 0 20px rgba(0, 255, 136, 0.35);
    animation: pulse-dot 2.4s ease-in-out infinite;
    transition:
      background 0.7s ease,
      box-shadow 0.7s ease;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .eyebrow-label {
    color: #f26522;
    position: relative;
    z-index: 1;
  }

  .dynamic-city {
    color: #ffffff;
    font-weight: 800;
    min-width: 80px;
    text-align: left;
    position: relative;
    z-index: 1;
    animation: city-enter 0.55s cubic-bezier(0.23, 1, 0.32, 1) both;
    transition:
      opacity 0.45s ease,
      transform 0.45s ease,
      filter 0.45s ease;
  }

  .dynamic-city.city-exit {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
    filter: blur(3px);
  }

  /* ── Hero text ── */
  .hero h1 {
    font-family: var(--font-display);
    font-size: clamp(2.7rem, 7vw, 5.4rem);
    font-weight: 800;
    line-height: 1.07;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 26px;
  }
  .hero h1 em {
    font-style: normal;
    color: var(--orange);
  }
  .hero-sub {
    font-size: clamp(1rem, 2.5vw, 1.22rem);
    line-height: 1.7;
    color: var(--text-2);
    max-width: 580px;
    margin: 0 auto 48px;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
    margin-bottom: 52px;
  }
  .hero-note {
    font-size: 0.78rem;
    color: var(--text-3);
    letter-spacing: 0.02em;
  }

  /* ── Buttons ── */
  .btn-hero-primary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 15px 32px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: 100px;
    text-decoration: none;
    letter-spacing: 0.02em;
    box-shadow: 0 8px 32px rgba(242, 101, 34, 0.38);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .btn-hero-primary:hover {
    background: #d95618;
    transform: translateY(-2px);
    box-shadow: 0 14px 44px rgba(242, 101, 34, 0.52);
  }
  .btn-hero-secondary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: var(--text-1);
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 100px;
    text-decoration: none;
    backdrop-filter: blur(8px);
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s;
  }
  .btn-hero-secondary:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* ════════════════════════════════════════
     STATS STRIP
  ════════════════════════════════════════ */
  .stats-strip {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    border-bottom: 1px solid var(--rim);
    padding: 52px 2rem;
  }
  .stats-inner {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .stat-item {
    text-align: center;
    padding: 20px 12px;
    border-right: 1px solid var(--rim);
    position: relative;
  }
  .stat-item::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 2px;
    background: var(--orange);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .stat-item:hover::after {
    opacity: 1;
  }
  .stat-item:last-child {
    border-right: none;
  }
  .stat-value {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.6rem);
    font-weight: 800;
    color: var(--orange);
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 7px;
  }
  .stat-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-3);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ════════════════════════════════════════
     PARTNERS
  ════════════════════════════════════════ */
  .partners {
    padding: 72px 2rem;
    border-bottom: 1px solid var(--rim);
  }
  .partners-inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .partners-label {
    text-align: center;
    margin-bottom: 40px;
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .partners-logos {
    display: flex;
    flex-wrap: wrap;
    gap: 24px 52px;
    align-items: center;
    justify-content: center;
  }
  .partner-logo {
    height: 34px;
    opacity: 0.35;
    filter: brightness(0) invert(1);
    transition:
      opacity 0.3s,
      filter 0.3s,
      transform 0.3s;
  }
  .partner-logo:hover {
    opacity: 0.9;
    filter: brightness(1) invert(0);
    transform: translateY(-2px);
  }

  /* ════════════════════════════════════════
     SHARED SECTION HEADER
  ════════════════════════════════════════ */
  .section-header {
    text-align: center;
    margin-bottom: 68px;
  }
  .section-eyebrow {
    display: inline-block;
    margin-bottom: 18px;
    padding: 4px 16px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
  }
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.13;
    margin-bottom: 18px;
  }
  .section-sub {
    font-size: 1.05rem;
    color: var(--text-2);
    line-height: 1.72;
    max-width: 540px;
    margin: 0 auto;
  }

  /* ════════════════════════════════════════
     HOW IT WORKS
  ════════════════════════════════════════ */
  .how-it-works {
    padding: 110px 2rem;
  }
  .how-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    position: relative;
  }
  .steps-grid::before {
    content: "";
    position: absolute;
    top: 84px;
    left: calc(16.6% + 1px);
    right: calc(16.6% + 1px);
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(242, 101, 34, 0.8),
      rgba(242, 101, 34, 0.15)
    );
    z-index: 0;
  }
  .step-card {
    padding: 44px 36px;
    position: relative;
    z-index: 1;
    transition: background 0.3s;
    border-radius: 20px;
  }
  .step-card:hover {
    background: rgba(242, 101, 34, 0.03);
  }
  .step-num {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--text-3);
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  .step-icon-ring {
    width: 68px;
    height: 68px;
    border-radius: 20px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30px;
    transition:
      border-color 0.3s,
      background 0.3s,
      transform 0.25s;
  }
  .step-card:hover .step-icon-ring {
    border-color: rgba(242, 101, 34, 0.42);
    background: rgba(242, 101, 34, 0.08);
    transform: translateY(-3px);
  }
  .step-icon-ring img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .step-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
  }
  .step-desc {
    font-size: 0.9rem;
    line-height: 1.72;
    color: var(--text-2);
  }

  /* ════════════════════════════════════════
     FEATURES
  ════════════════════════════════════════ */
  .features {
    padding: 110px 2rem;
    background: var(--ink-2);
  }
  .features-inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .feature-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 22px;
    padding: 38px 32px;
    transition:
      border-color 0.3s,
      transform 0.3s,
      box-shadow 0.3s;
    position: relative;
    overflow: hidden;
  }
  .feature-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.5),
      transparent
    );
    opacity: 0;
    transition: opacity 0.3s;
  }
  .feature-card:hover {
    border-color: rgba(242, 101, 34, 0.3);
    transform: translateY(-5px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  }
  .feature-card:hover::before {
    opacity: 1;
  }
  .feature-icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 26px;
    transition:
      background 0.3s,
      border-color 0.3s;
  }
  .feature-card:hover .feature-icon {
    background: rgba(242, 101, 34, 0.16);
    border-color: rgba(242, 101, 34, 0.4);
  }
  .feature-icon img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
  .feature-name {
    font-family: var(--font-display);
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .feature-desc {
    font-size: 0.875rem;
    line-height: 1.72;
    color: var(--text-2);
  }
  .feature-audience {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 22px;
  }
  .audience-tag {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--rim);
    color: var(--text-3);
    border: 1px solid var(--rim-2);
  }

  /* ════════════════════════════════════════
     TESTIMONIALS
  ════════════════════════════════════════ */
  .testimonials {
    padding: 110px 2rem;
  }
  .testimonials-inner {
    max-width: 1200px;
    margin: 0 auto;
  }
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .testimonial-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 30px;
    transition:
      border-color 0.3s,
      transform 0.25s;
  }
  .testimonial-card:hover {
    border-color: var(--rim-2);
    transform: translateY(-3px);
  }
  .testimonial-card.featured {
    border-color: rgba(242, 101, 34, 0.22);
    background: rgba(242, 101, 34, 0.035);
  }
  .testimonial-card.featured:hover {
    border-color: rgba(242, 101, 34, 0.38);
  }
  .stars {
    display: flex;
    gap: 3px;
    margin-bottom: 18px;
  }
  .star {
    font-size: 0.85rem;
    color: var(--orange);
  }
  .star.empty {
    color: var(--rim-2);
  }
  .testimonial-text {
    font-size: 0.92rem;
    line-height: 1.72;
    color: var(--text-1);
    margin-bottom: 22px;
    font-style: italic;
  }
  .testimonial-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .testimonial-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .testimonial-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .testimonial-type {
    font-size: 0.74rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  /* ════════════════════════════════════════
     OPERATOR CALLOUT
  ════════════════════════════════════════ */
  .operator-callout {
    padding: 110px 2rem;
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    border-bottom: 1px solid var(--rim);
  }
  .operator-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 84px;
    align-items: center;
  }
  .operator-label {
    display: inline-block;
    margin-bottom: 22px;
    padding: 4px 14px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
  }
  .operator-content h2 {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.18;
    margin-bottom: 20px;
  }
  .operator-content p {
    font-size: 1rem;
    line-height: 1.78;
    color: var(--text-2);
    margin-bottom: 38px;
  }
  .operator-benefits {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 42px;
  }
  .operator-benefit {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 0.9rem;
    color: var(--text-2);
  }
  .benefit-check {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }
  .benefit-check svg {
    color: var(--teal);
  }
  .btn-teal {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: transparent;
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.4);
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s;
  }
  .btn-teal:hover {
    background: rgba(0, 176, 155, 0.1);
    border-color: var(--teal);
    transform: translateY(-1px);
  }

  .operator-visual {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 26px;
    padding: 38px;
    position: relative;
    overflow: hidden;
  }
  .op-glow {
    position: absolute;
    top: -80px;
    right: -80px;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.18),
      transparent 70%
    );
    pointer-events: none;
  }
  .op-stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    position: relative;
  }
  .op-stat {
    background: var(--ink-2);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 24px 20px;
    transition:
      border-color 0.3s,
      transform 0.25s;
  }
  .op-stat:hover {
    border-color: rgba(0, 176, 155, 0.3);
    transform: translateY(-2px);
  }
  .op-stat-val {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.03em;
    margin-bottom: 5px;
  }
  .op-stat-lbl {
    font-size: 0.77rem;
    color: var(--text-3);
    font-weight: 500;
  }

  /* ════════════════════════════════════════
     FINAL CTA
  ════════════════════════════════════════ */
  .final-cta {
    padding: 130px 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .final-cta::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 65% 55% at 50% 0%,
      rgba(242, 101, 34, 0.16),
      transparent 65%
    );
    pointer-events: none;
  }
  .final-cta-inner {
    position: relative;
    max-width: 680px;
    margin: 0 auto;
  }
  .final-cta h2 {
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 5vw, 3.5rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.09;
    margin-bottom: 22px;
  }
  .final-cta h2 em {
    font-style: normal;
    color: var(--orange);
  }
  .final-cta p {
    font-size: 1.05rem;
    color: var(--text-2);
    line-height: 1.72;
    margin-bottom: 46px;
  }
  .final-cta-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
    margin-bottom: 32px;
  }
  .final-note {
    font-size: 0.78rem;
    color: var(--text-3);
  }

  /* ════════════════════════════════════════
     RESPONSIVE
  ════════════════════════════════════════ */
  @media (max-width: 1024px) {
    .steps-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .steps-grid::before {
      display: none;
    }
    .step-card {
      padding: 30px 26px;
      border-bottom: 1px solid var(--rim);
      border-radius: 0;
    }
    .step-card:last-child {
      border-bottom: none;
    }
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .testimonials-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .operator-inner {
      grid-template-columns: 1fr;
      gap: 52px;
    }
  }
  @media (max-width: 640px) {
    .stats-inner {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat-item:nth-child(2) {
      border-right: none;
    }
    .stat-item:nth-child(3) {
      border-right: 1px solid var(--rim);
    }
    .features-grid {
      grid-template-columns: 1fr;
    }
    .testimonials-grid {
      grid-template-columns: 1fr;
    }
    .op-stat-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
