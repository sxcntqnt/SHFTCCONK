<script lang="ts">
  import { WebsiteName } from "./../../config";
  import { onMount } from "svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { page } from "$app/stores";

  let { children } = $props();

  /* ── NAV CONFIG ── */
  const navSections = [
    {
      label: "Product",
      key: "product",
      items: [
        { label: "Live Tracking", href: "/product/features", desc: "Real-time vehicle positions" },
        { label: "Route Planner", href: "/product/routes", desc: "Optimized navigation" },
        { label: "Fare Estimates", href: "/product/fares", desc: "Know before boarding" }
      ]
    },
    {
      label: "Solutions",
      key: "solutions",
      items: [
        { label: "For Commuters", href: "/solutions/commuters", desc: "Simplified commuting" },
        { label: "For Operators", href: "/solutions/operators", desc: "Fleet intelligence" },
        { label: "Enterprise", href: "/solutions/enterprise", desc: "Large-scale deployments" }
      ]
    },
    {
      label: "Resources",
      key: "resources",
      items: [
        { label: "Documentation", href: "/docs", desc: "API reference & guides" },
        { label: "Blog", href: "/blog", desc: "Latest updates & stories" },
        { label: "Help Center", href: "/help", desc: "FAQs & support" },
        { label: "Community", href: "/community", desc: "Join discussions" }
      ]
    },
    {
      label: "Company",
      key: "company",
      items: [
        { label: "About Us", href: "/about", desc: "Our mission & story" },
        { label: "Careers", href: "/careers", desc: "Join our team" },
        { label: "Contact", href: "/contact", desc: "Get in touch" },
        { label: "Press", href: "/press", desc: "Media resources" }
      ]
    }
  ];

  /* ── STATE ── */
  let activeMenu: string | null = $state(null);
  let mobileOpen = $state(false);
  let scrolled = $state(false);
  let hoverTimeout: ReturnType<typeof setTimeout>;

  function openMenu(key: string) {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    activeMenu = key;
  }

  function closeMenu() {
    hoverTimeout = setTimeout(() => { activeMenu = null; }, 200);
  }

  function toggleMenu(key: string) {
    activeMenu = activeMenu === key ? null : key;
  }

  onMount(() => {
    const onScroll = () => { scrolled = window.scrollY > 30; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  let currentPath = $derived($page.url.pathname);
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(:root) {
    --orange:    #F26522;
    --orange-dim: #F2652220;
    --orange-glow: #F2652240;
    --teal:      #00B09B;
    --ink:       #0A0A0C;
    --ink-2:     #111115;
    --ink-3:     #18181f;
    --surface:   #1a1a22;
    --rim:       #ffffff0f;
    --rim-2:     #ffffff18;
    --text-1:    #F0EEE8;
    --text-2:    #9996a8;
    --text-3:    #605d70;
    --font-display: 'Syne', sans-serif;
    --font-body:    'DM Sans', sans-serif;
  }

  :global(html, body) {
    background: var(--ink);
    color: var(--text-1);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    scroll-behavior: smooth;
  }

  /* ── NAV ── */
  nav.topbar {
    position: sticky; top: 0; z-index: 100;
    padding: 0 2rem;
    transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
    border-bottom: 1px solid transparent;
  }
  nav.topbar.scrolled {
    background: rgba(10,10,12,0.85);
    backdrop-filter: blur(24px) saturate(180%);
    border-bottom-color: var(--rim);
    box-shadow: 0 1px 0 var(--rim), 0 8px 32px rgba(0,0,0,0.5);
  }

  .nav-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    height: 68px;
  }

  .logo {
    font-family: var(--font-display);
    font-size: 1.5rem; font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    text-decoration: none;
    transition: color 0.2s;
  }
  .logo span { color: var(--orange); }
  .logo:hover { color: var(--orange); }

  .desktop-nav {
    display: flex; align-items: center; gap: 2px;
  }

  .nav-item { position: relative; }

  .nav-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px;
    font-family: var(--font-body);
    font-size: 0.875rem; font-weight: 500;
    color: var(--text-2);
    background: none; border: none; cursor: pointer;
    border-radius: 100px;
    transition: color 0.2s, background 0.2s;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
  .nav-btn:hover, .nav-btn.active { color: var(--text-1); background: var(--rim); }
  .nav-btn svg { transition: transform 0.25s ease; flex-shrink: 0; }
  .nav-btn.active svg { transform: rotate(180deg); }

  .dropdown {
    position: absolute; left: 50%; transform: translateX(-50%);
    top: calc(100% + 12px);
    width: 280px;
    background: var(--ink-3);
    border: 1px solid var(--rim-2);
    border-radius: 16px;
    padding: 8px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px var(--rim);
  }

  .dropdown a {
    display: flex; flex-direction: column; gap: 2px;
    padding: 12px 14px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s;
  }
  .dropdown a:hover { background: var(--rim); }
  .dropdown a.active-link { background: var(--orange-dim); }
  .dropdown .d-label {
    font-size: 0.875rem; font-weight: 500; color: var(--text-1);
  }
  .dropdown .d-desc {
    font-size: 0.78rem; color: var(--text-3);
  }
  .dropdown a.active-link .d-label { color: var(--orange); }

  .nav-divider {
    width: 1px; height: 20px; background: var(--rim-2); margin: 0 8px;
  }

  .nav-link-plain {
    padding: 8px 16px;
    font-size: 0.875rem; font-weight: 500; color: var(--text-2);
    text-decoration: none; border-radius: 100px;
    transition: color 0.2s, background 0.2s;
  }
  .nav-link-plain:hover { color: var(--text-1); background: var(--rim); }
  .nav-link-plain.active { color: var(--text-1); }

  .btn-signin {
    margin-left: 8px;
    padding: 9px 22px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.875rem; font-weight: 600;
    border: none; border-radius: 100px; cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    box-shadow: 0 0 0 0 var(--orange-glow);
  }
  .btn-signin:hover {
    background: #d95618;
    box-shadow: 0 4px 24px var(--orange-glow);
    transform: translateY(-1px);
  }
  .btn-signin:active { transform: translateY(0); }

  /* ── HAMBURGER ── */
  .hamburger {
    display: none;
    background: none; border: none; cursor: pointer;
    color: var(--text-1); font-size: 1.5rem; padding: 8px;
    border-radius: 10px;
    transition: background 0.2s;
  }
  .hamburger:hover { background: var(--rim); }

  /* ── MOBILE PANEL ── */
  .mobile-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(6px);
  }
  .mobile-panel {
    position: absolute; right: 0; top: 0;
    height: 100%; width: min(360px, 90vw);
    background: var(--ink-2);
    border-left: 1px solid var(--rim-2);
    overflow-y: auto;
    padding: 24px 20px 40px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .mobile-close {
    align-self: flex-end; margin-bottom: 16px;
    background: var(--rim); border: none; cursor: pointer;
    color: var(--text-1); width: 36px; height: 36px;
    border-radius: 50%; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .mobile-close:hover { background: var(--rim-2); }
  .mobile-section-title {
    font-family: var(--font-display);
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-3);
    padding: 18px 12px 8px;
  }
  .mobile-link {
    display: block; padding: 11px 14px;
    font-size: 0.9rem; font-weight: 500; color: var(--text-2);
    text-decoration: none; border-radius: 10px;
    transition: background 0.15s, color 0.15s;
  }
  .mobile-link:hover { background: var(--rim); color: var(--text-1); }
  .mobile-signin {
    display: block; margin-top: 24px;
    padding: 14px; text-align: center;
    background: var(--orange); color: #fff;
    font-weight: 600; border-radius: 100px;
    text-decoration: none; font-size: 0.95rem;
    transition: background 0.2s;
  }
  .mobile-signin:hover { background: #d95618; }

  /* ── MAIN ── */
  main { min-height: 100vh; }

  /* ── CTA SECTION ── */
  .cta-section {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    padding: 100px 2rem;
    position: relative; overflow: hidden;
  }
  .cta-section::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 20% 50%, var(--orange-dim), transparent),
                radial-gradient(ellipse 50% 60% at 80% 50%, rgba(0,176,155,0.06), transparent);
    pointer-events: none;
  }
  .cta-grid {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  }
  .cta-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 24px;
    padding: 52px 44px;
    position: relative; overflow: hidden;
    transition: border-color 0.3s, transform 0.3s;
  }
  .cta-card:hover {
    border-color: var(--rim-2);
    transform: translateY(-4px);
  }
  .cta-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--rim-2), transparent);
  }
  .cta-badge {
    display: inline-block; margin-bottom: 20px;
    padding: 4px 12px; border-radius: 100px;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .cta-badge.orange { background: var(--orange-dim); color: var(--orange); border: 1px solid var(--orange-glow); }
  .cta-badge.teal { background: rgba(0,176,155,0.12); color: var(--teal); border: 1px solid rgba(0,176,155,0.25); }
  .cta-card h3 {
    font-family: var(--font-display);
    font-size: 1.45rem; font-weight: 700; line-height: 1.3;
    color: var(--text-1); margin-bottom: 14px;
    letter-spacing: -0.02em;
  }
  .cta-card p {
    font-size: 0.95rem; line-height: 1.65;
    color: var(--text-2); margin-bottom: 32px;
  }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 28px;
    background: var(--orange); color: #fff;
    font-weight: 600; font-size: 0.9rem;
    border-radius: 100px; text-decoration: none;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    box-shadow: 0 4px 20px var(--orange-glow);
  }
  .btn-primary:hover { background: #d95618; transform: translateY(-1px); box-shadow: 0 8px 32px var(--orange-glow); }
  .btn-outline {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 28px;
    background: transparent; color: var(--teal);
    font-weight: 600; font-size: 0.9rem;
    border: 1px solid rgba(0,176,155,0.4);
    border-radius: 100px; text-decoration: none;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .btn-outline:hover { background: rgba(0,176,155,0.1); border-color: var(--teal); transform: translateY(-1px); }

  /* ── FOOTER ── */
  footer {
    background: var(--ink);
    border-top: 1px solid var(--rim);
    padding: 72px 2rem 0;
  }
  .footer-inner {
    max-width: 1280px; margin: 0 auto;
    display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr;
    gap: 48px; padding-bottom: 64px;
  }
  .footer-brand-name {
    font-family: var(--font-display);
    font-size: 1.6rem; font-weight: 800;
    letter-spacing: -0.03em; color: var(--text-1);
    margin-bottom: 14px; display: block;
  }
  .footer-brand-name span { color: var(--orange); }
  .footer-tagline {
    font-size: 0.9rem; line-height: 1.7;
    color: var(--text-3); max-width: 260px; margin-bottom: 28px;
  }
  .footer-socials {
    display: flex; gap: 10px;
  }
  .social-btn {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--rim); border: 1px solid var(--rim-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; text-decoration: none;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    color: var(--text-2);
  }
  .social-btn:hover { background: var(--orange-dim); border-color: var(--orange-glow); color: var(--orange); transform: translateY(-2px); }

  .footer-col h6 {
    font-family: var(--font-display);
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-3);
    margin-bottom: 20px;
  }
  .footer-col a {
    display: block; margin-bottom: 12px;
    font-size: 0.875rem; color: var(--text-2);
    text-decoration: none;
    transition: color 0.2s;
  }
  .footer-col a:hover { color: var(--text-1); }

  .footer-bottom {
    border-top: 1px solid var(--rim);
    padding: 22px 2rem;
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .footer-bottom p {
    font-size: 0.8rem; color: var(--text-3);
  }
  .footer-bottom-links { display: flex; gap: 20px; }
  .footer-bottom-links a {
    font-size: 0.8rem; color: var(--text-3);
    text-decoration: none; transition: color 0.2s;
  }
  .footer-bottom-links a:hover { color: var(--text-2); }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .desktop-nav { display: none; }
    .hamburger { display: flex; }
    .cta-grid { grid-template-columns: 1fr; }
    .footer-inner { grid-template-columns: 1fr 1fr; gap: 36px; }
    .footer-brand { grid-column: span 2; }
  }
  @media (max-width: 640px) {
    .footer-inner { grid-template-columns: 1fr 1fr; }
    .footer-brand { grid-column: span 2; }
    .cta-card { padding: 36px 28px; }
    .footer-bottom { flex-direction: column; align-items: flex-start; }
  }
</style>

<!-- ═══════════════════════ NAVBAR ═══════════════════════ -->
<nav class="topbar {scrolled ? 'scrolled' : ''}">
  <div class="nav-inner">
    <!-- Logo -->
    <a href="/" class="logo">
      {WebsiteName.slice(0, -2)}<span>{WebsiteName.slice(-2)}</span>
    </a>

    <!-- Desktop -->
    <div class="desktop-nav">
      {#each navSections as section}
        <div
          class="nav-item"
          onmouseenter={() => openMenu(section.key)}
          onmouseleave={closeMenu}
        >
          <button
            class="nav-btn {activeMenu === section.key ? 'active' : ''}"
            onclick={() => toggleMenu(section.key)}
          >
            {section.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {#if activeMenu === section.key}
            <div
              class="dropdown"
              in:fade={{ duration: 150 }}
              onmouseenter={() => { if (hoverTimeout) clearTimeout(hoverTimeout); }}
              onmouseleave={closeMenu}
            >
              {#each section.items as item}
                <a
                  href={item.href}
                  class="{currentPath === item.href ? 'active-link' : ''}"
                >
                  <span class="d-label">{item.label}</span>
                  <span class="d-desc">{item.desc}</span>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      <div class="nav-divider"></div>

      <a
        href="/docs"
        class="nav-link-plain {currentPath.startsWith('/docs') ? 'active' : ''}"
      >
        Docs
      </a>
      <a
        href="/blog"
        class="nav-link-plain {currentPath.startsWith('/blog') ? 'active' : ''}"
      >
        Blog
      </a>
      <a href="/login" class="btn-signin">Sign In</a>
    </div>

    <!-- Hamburger -->
    <button
      class="hamburger"
      onclick={() => (mobileOpen = true)}
      aria-label="Open menu"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="7" x2="21" y2="7"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="17" x2="21" y2="17"/>
      </svg>
    </button>
  </div>
</nav>

<!-- ═══════════════════════ MOBILE PANEL ═══════════════════════ -->
{#if mobileOpen}
  <div
    class="mobile-overlay"
    onclick={() => (mobileOpen = false)}
    transition:fade={{ duration: 180 }}
  >
    <div
      class="mobile-panel"
      onclick={(event) => {
        event.stopPropagation();  // ← Prevents clicks inside the panel from closing the menu
      }}
      transition:fly={{ x: 320, duration: 280 }}
    >
      <button
        class="mobile-close"
        onclick={() => (mobileOpen = false)}
      >
        ✕
      </button>

      {#each navSections as section}
        <p class="mobile-section-title">{section.label}</p>
        {#each section.items as item}
          <a
            href={item.href}
            class="mobile-link"
            onclick={() => (mobileOpen = false)}
          >
            {item.label}
          </a>
        {/each}
      {/each}

      <p class="mobile-section-title">Quick Links</p>
      <a href="/docs" class="mobile-link" onclick={() => (mobileOpen = false)}>Docs</a>
      <a href="/blog" class="mobile-link" onclick={() => (mobileOpen = false)}>Blog</a>
      <a
        href="/login"
        class="mobile-signin"
        onclick={() => (mobileOpen = false)}
      >
        Sign In →
      </a>
    </div>
  </div>
{/if}

<!-- ═══════════════════════ MAIN CONTENT ═══════════════════════ -->
<main>
  {@render children?.()}
</main>

<!-- ═══════════════════════ DUAL CTA ═══════════════════════ -->
<section class="cta-section">
  <div class="cta-grid">
    <!-- Commuter CTA -->
    <div class="cta-card">
      <span class="cta-badge orange">For Riders</span>
      <h3>Stop Guessing When Your Matatu Arrives</h3>
      <p>Live tracking, arrival predictions, and fare estimates — so every commute runs on your terms.</p>
      <a href="/dashboard" class="btn-primary">
        Download App
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>

    <!-- Operator CTA -->
    <div class="cta-card">
      <span class="cta-badge teal">For Operators</span>
      <h3>Running a Sacco or Fleet?</h3>
      <p>Real-time tracking, delay alerts, route analytics, and optimization tools built for Nairobi roads.</p>
      <a href="/contact" class="btn-outline">
        Request a Demo
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>
</section>

<!-- ═══════════════════════ FOOTER ═══════════════════════ -->
<footer>
  <div class="footer-inner">

    <!-- Brand -->
    <aside class="footer-brand">
      <span class="footer-brand-name">{WebsiteName.slice(0,-2)}<span>{WebsiteName.slice(-2)}</span></span>
      <p class="footer-tagline">Real-time matatu tracking in Nairobi — predictable arrivals, smarter commutes, better operations.</p>
      <div class="footer-socials">
        <a href="#" aria-label="Facebook" class="social-btn">f</a>
        <a href="#" aria-label="WhatsApp" class="social-btn">w</a>
        <a href="#" aria-label="X / Twitter" class="social-btn">𝕏</a>
        <a href="#" aria-label="Instagram" class="social-btn">ig</a>
        <a href="#" aria-label="TikTok" class="social-btn">tt</a>
        <a href="#" aria-label="YouTube" class="social-btn">yt</a>
      </div>
    </aside>

    <!-- Product -->
    <div class="footer-col">
      <h6>Product</h6>
      <a href="/product/features">Live Tracking</a>
      <a href="/product/routes">Route Planner</a>
      <a href="/product/fares">Fare Estimates</a>
      <a href="/dashboard">Track Now</a>
    </div>

    <!-- Company -->
    <div class="footer-col">
      <h6>Company</h6>
      <a href="/about">About Us</a>
      <a href="/blog">Blog</a>
      <a href="/careers">Careers</a>
      <a href="/contact">Contact</a>
      <a href="/press">Press</a>
    </div>

    <!-- Legal -->
    <div class="footer-col">
      <h6>Legal</h6>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/security">Security</a>
      <h6 style="margin-top:28px">Resources</h6>
      <a href="/docs">Documentation</a>
      <a href="/help">Help Center</a>
      <a href="/community">Community</a>
    </div>

  </div>

  <!-- Bottom bar -->
  <div class="footer-bottom" style="border-top: 1px solid var(--rim); padding: 22px 0;">
    <p>© {new Date().getFullYear()} {WebsiteName}. Designed for smarter urban mobility in Nairobi.</p>
    <div class="footer-bottom-links">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/security">Security</a>
    </div>
  </div>
</footer>