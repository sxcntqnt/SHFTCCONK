<script lang="ts">
  import { WebsiteName } from "./../../config"
  import { onMount } from "svelte"
  import { fade, fly } from "svelte/transition"
  import { page } from "$app/state"

  interface Props {
    children?: import("svelte").Snippet
  }

  let { children = undefined }: Props = $props()

  const navSections = [
    {
      label: "Product",
      key: "product",
      items: [
        {
          label: "Live Tracking",
          href: "/product/features",
          desc: "Real-time vehicle positions",
        },
        {
          label: "Route Planner",
          href: "/product/routes",
          desc: "Optimised navigation",
        },
        {
          label: "Fare Estimates",
          href: "/product/fares",
          desc: "Know before boarding",
        },
      ],
    },
    {
      label: "Solutions",
      key: "solutions",
      items: [
        {
          label: "For Commuters",
          href: "/solutions/commuters",
          desc: "Simplified commuting",
        },
        {
          label: "For Operators",
          href: "/solutions/operators",
          desc: "Fleet intelligence",
        },
        {
          label: "Enterprise",
          href: "/solutions/enterprise",
          desc: "Large-scale deployments",
        },
      ],
    },
    {
      label: "Resources",
      key: "resources",
      items: [
        {
          label: "Documentation",
          href: "/docs",
          desc: "API reference & guides",
        },
        { label: "Blog", href: "/blog", desc: "Latest updates & stories" },
        { label: "Help Center", href: "/help", desc: "FAQs & support" },
        { label: "Community", href: "/community", desc: "Join discussions" },
      ],
    },
    {
      label: "Company",
      key: "company",
      items: [
        { label: "About Us", href: "/about", desc: "Our mission & story" },
        { label: "Careers", href: "/careers", desc: "Join our team" },
        { label: "Contact", href: "/contact_us", desc: "Get in touch" },
        { label: "Press", href: "/press", desc: "Media resources" },
      ],
    },
  ]

  let activeMenu = $state<string | null>(null)
  let mobileOpen = $state(false)
  let scrolled = $state(false)
  let hoverTimeout: ReturnType<typeof setTimeout>

  function openMenu(key: string) {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    activeMenu = key
  }
  function closeMenu() {
    hoverTimeout = setTimeout(() => {
      activeMenu = null
    }, 180)
  }
  function toggleMenu(key: string) {
    activeMenu = activeMenu === key ? null : key
  }

  onMount(() => {
    const onScroll = () => {
      scrolled = window.scrollY > 30
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  })

  let currentPath = $derived(page.url.pathname)
</script>

<!-- ═══════════ NAVBAR ═══════════ -->
<nav class="topbar" class:scrolled>
  <div class="nav-inner">
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
            class="nav-btn"
            class:active={activeMenu === section.key}
            onclick={() => toggleMenu(section.key)}
          >
            {section.label}
            <svg
              class="chevron"
              class:rotated={activeMenu === section.key}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {#if activeMenu === section.key}
            <div
              class="dropdown"
              in:fade={{ duration: 130 }}
              onmouseenter={() => {
                if (hoverTimeout) clearTimeout(hoverTimeout)
              }}
              onmouseleave={closeMenu}
            >
              {#each section.items as item}
                <a
                  href={item.href}
                  class:active-link={currentPath === item.href}
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
        class="nav-link-plain"
        class:active={currentPath.startsWith("/docs")}>Docs</a
      >
      <a
        href="/blog"
        class="nav-link-plain"
        class:active={currentPath.startsWith("/blog")}>Blog</a
      >
      <a href="/login" class="btn-signin">Sign In</a>
    </div>

    <!-- Hamburger -->
    <button
      class="hamburger"
      onclick={() => (mobileOpen = true)}
      aria-label="Open menu"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="17" x2="21" y2="17" />
      </svg>
    </button>
  </div>
</nav>

<!-- ═══════════ MOBILE PANEL ═══════════ -->
{#if mobileOpen}
  <div
    class="mobile-overlay"
    onclick={() => (mobileOpen = false)}
    transition:fade={{ duration: 180 }}
  >
    <div
      class="mobile-panel"
      onclick={(e) => e.stopPropagation()}
      transition:fly={{ x: 320, duration: 280 }}
    >
      <button class="mobile-close" onclick={() => (mobileOpen = false)}
        >✕</button
      >

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
      <a href="/docs" class="mobile-link" onclick={() => (mobileOpen = false)}
        >Docs</a
      >
      <a href="/blog" class="mobile-link" onclick={() => (mobileOpen = false)}
        >Blog</a
      >
      <a
        href="/login"
        class="mobile-signin"
        onclick={() => (mobileOpen = false)}>Sign In →</a
      >
    </div>
  </div>
{/if}

<!-- ═══════════ MAIN CONTENT ═══════════ -->
<main>{@render children?.()}</main>

<!-- ═══════════ DUAL CTA ═══════════ -->
<section class="cta-section">
  <div class="cta-grid">
    <div class="cta-card cta-orange">
      <div class="cta-card-glow orange-glow"></div>
      <span class="cta-badge badge-orange">For Riders</span>
      <h3>Stop Guessing When Your Matatu Arrives</h3>
      <p>
        Live tracking, arrival predictions, and fare estimates — so every
        commute runs on your terms.
      </p>
      <a href="/download" class="btn-primary">
        Download App
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

    <div class="cta-card cta-teal">
      <div class="cta-card-glow teal-glow"></div>
      <span class="cta-badge badge-teal">For Operators</span>
      <h3>Running a Sacco or Fleet?</h3>
      <p>
        Real-time tracking, delay alerts, route analytics, and optimisation
        tools built for Nairobi roads.
      </p>
      <a href="/contact_us" class="btn-outline">
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
  </div>
</section>

<!-- ═══════════ FOOTER ═══════════ -->
<footer>
  <div class="footer-inner">
    <!-- Brand column -->
    <aside class="footer-brand">
      <span class="footer-logo">
        {WebsiteName.slice(0, -2)}<span>{WebsiteName.slice(-2)}</span>
      </span>
      <p class="footer-tagline">
        Real-time matatu tracking in Nairobi — predictable arrivals, smarter
        commutes, better operations.
      </p>
      <div class="footer-socials">
        {#each [{ label: "Facebook", short: "f" }, { label: "WhatsApp", short: "w" }, { label: "X / Twitter", short: "𝕏" }, { label: "Instagram", short: "ig" }, { label: "TikTok", short: "tt" }, { label: "YouTube", short: "yt" }] as s}
          <a href="#" aria-label={s.label} class="social-btn">{s.short}</a>
        {/each}
      </div>
    </aside>

    <!-- Product -->
    <div class="footer-col">
      <h6>Product</h6>
      <a href="/product/features">Live Tracking</a>
      <a href="/product/routes">Route Planner</a>
      <a href="/product/fares">Fare Estimates</a>
      <a href="/login">Stressless Today</a>
    </div>

    <!-- Company -->
    <div class="footer-col">
      <h6>Company</h6>
      <a href="/about">About Us</a>
      <a href="/blog">Blog</a>
      <a href="/careers">Careers</a>
      <a href="/contact_us">Contact</a>
      <a href="/press">Press</a>
      <a href="/cookies">Cookies</a>
    </div>

    <!-- Legal -->
    <div class="footer-col">
      <h6>Legal</h6>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/security">Security</a>
      <a href="/legal/gdpr">Legal</a>
      <a href="/legal/gdpr/structure">More Info</a>
    </div>

    <!-- Resources — now a proper 5th column, same row -->
    <div class="footer-col">
      <h6>Resources</h6>
      <a href="/docs">Documentation</a>
      <a href="/help">Help Center</a>
      <a href="/community">Community</a>
    </div>

    <!-- Bottom bar spans all 5 columns -->
    <div class="footer-bottom">
      <p>
        © {new Date().getFullYear()}
        {WebsiteName}. Designed for smarter urban mobility in Nairobi.
      </p>
      <div class="footer-bottom-links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/security">Security</a>
      </div>
    </div>
  </div>
</footer>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap");

  /* ════════════════════════════════════
     GLOBAL TOKENS
  ════════════════════════════════════ */
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --orange: #f26522;
    --orange-dim: #f2652218;
    --orange-glow: #f2652240;
    --teal: #00b09b;
    --teal-dim: #00b09b18;
    --teal-glow: #00b09b38;
    --ink: #0a0a0c;
    --ink-2: #111115;
    --ink-3: #17171f;
    --surface: #1a1a22;
    --rim: #ffffff0e;
    --rim-2: #ffffff18;
    --text-1: #f0eee8;
    --text-2: #9996a8;
    --text-3: #605d70;
    --font-display: "Syne", sans-serif;
    --font-body: "DM Sans", sans-serif;
  }

  :global(html, body) {
    background: var(--ink);
    color: var(--text-1);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    scroll-behavior: smooth;
  }

  :global(a) {
    color: inherit;
  }

  /* ════════════════════════════════════
     NAVBAR
  ════════════════════════════════════ */
  nav.topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0 2rem;
    transition:
      background 0.4s ease,
      border-color 0.4s ease,
      box-shadow 0.4s ease;
    border-bottom: 1px solid transparent;
  }
  nav.topbar.scrolled {
    background: rgba(10, 10, 12, 0.88);
    backdrop-filter: blur(28px) saturate(180%);
    border-bottom-color: var(--rim);
    box-shadow:
      0 1px 0 var(--rim),
      0 8px 40px rgba(0, 0, 0, 0.55);
  }

  .nav-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 68px;
  }

  .logo {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .logo:hover {
    opacity: 0.85;
  }
  .logo span {
    color: var(--orange);
  }

  .desktop-nav {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .nav-item {
    position: relative;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 15px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-2);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 100px;
    transition:
      color 0.2s,
      background 0.2s;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
  .nav-btn:hover,
  .nav-btn.active {
    color: var(--text-1);
    background: var(--rim);
  }

  .chevron {
    transition: transform 0.25s ease;
  }
  .chevron.rotated {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: calc(100% + 14px);
    width: 276px;
    background: var(--ink-3);
    border: 1px solid var(--rim-2);
    border-radius: 18px;
    padding: 8px;
    box-shadow:
      0 28px 64px rgba(0, 0, 0, 0.65),
      0 0 0 1px var(--rim);
  }
  /* subtle arrow pointer */
  .dropdown::before {
    content: "";
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: var(--ink-3);
    border-top: 1px solid var(--rim-2);
    border-left: 1px solid var(--rim-2);
  }

  .dropdown a {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 11px 14px;
    border-radius: 11px;
    text-decoration: none;
    transition: background 0.14s;
  }
  .dropdown a:hover {
    background: var(--rim);
  }
  .dropdown a.active-link {
    background: var(--orange-dim);
  }
  .dropdown a.active-link .d-label {
    color: var(--orange);
  }

  .d-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-1);
  }
  .d-desc {
    font-size: 0.77rem;
    color: var(--text-3);
  }

  .nav-divider {
    width: 1px;
    height: 18px;
    background: var(--rim-2);
    margin: 0 8px;
  }

  .nav-link-plain {
    padding: 8px 15px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-2);
    text-decoration: none;
    border-radius: 100px;
    transition:
      color 0.2s,
      background 0.2s;
  }
  .nav-link-plain:hover,
  .nav-link-plain.active {
    color: var(--text-1);
    background: var(--rim);
  }

  .btn-signin {
    margin-left: 8px;
    padding: 9px 22px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.01em;
    box-shadow: 0 0 0 0 var(--orange-glow);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .btn-signin:hover {
    background: #d95618;
    box-shadow: 0 6px 28px var(--orange-glow);
    transform: translateY(-1px);
  }

  /* ════════════════════════════════════
     HAMBURGER
  ════════════════════════════════════ */
  .hamburger {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-1);
    padding: 8px;
    border-radius: 10px;
    transition: background 0.2s;
  }
  .hamburger:hover {
    background: var(--rim);
  }

  /* ════════════════════════════════════
     MOBILE PANEL
  ════════════════════════════════════ */
  .mobile-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
  }
  .mobile-panel {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: min(360px, 90vw);
    background: var(--ink-2);
    border-left: 1px solid var(--rim-2);
    overflow-y: auto;
    padding: 24px 20px 48px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mobile-close {
    align-self: flex-end;
    margin-bottom: 12px;
    background: var(--rim);
    border: none;
    cursor: pointer;
    color: var(--text-1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  .mobile-close:hover {
    background: var(--rim-2);
  }

  .mobile-section-title {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 20px 12px 8px;
  }
  .mobile-link {
    display: block;
    padding: 11px 14px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-2);
    text-decoration: none;
    border-radius: 10px;
    transition:
      background 0.14s,
      color 0.14s;
  }
  .mobile-link:hover {
    background: var(--rim);
    color: var(--text-1);
  }
  .mobile-signin {
    display: block;
    margin-top: 24px;
    padding: 14px;
    text-align: center;
    background: var(--orange);
    color: #fff;
    font-weight: 600;
    border-radius: 100px;
    text-decoration: none;
    font-size: 0.95rem;
    transition: background 0.2s;
  }
  .mobile-signin:hover {
    background: #d95618;
  }

  /* ════════════════════════════════════
     MAIN
  ════════════════════════════════════ */
  main {
    min-height: 100vh;
  }

  /* ════════════════════════════════════
     DUAL CTA
  ════════════════════════════════════ */
  .cta-section {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    padding: 100px 2rem;
    position: relative;
    overflow: hidden;
  }
  .cta-grid {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .cta-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 26px;
    padding: 52px 46px;
    position: relative;
    overflow: hidden;
    transition:
      border-color 0.3s,
      transform 0.3s,
      box-shadow 0.3s;
  }
  .cta-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  }
  .cta-orange:hover {
    border-color: rgba(242, 101, 34, 0.3);
  }
  .cta-teal:hover {
    border-color: rgba(0, 176, 155, 0.3);
  }

  .cta-card-glow {
    position: absolute;
    top: -80px;
    right: -80px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    pointer-events: none;
  }
  .orange-glow {
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.12),
      transparent 70%
    );
  }
  .teal-glow {
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.12),
      transparent 70%
    );
  }

  /* top shimmer */
  .cta-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .cta-orange::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.6),
      transparent
    );
  }
  .cta-teal::before {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 176, 155, 0.6),
      transparent
    );
  }
  .cta-card:hover::before {
    opacity: 1;
  }

  .cta-badge {
    display: inline-block;
    margin-bottom: 22px;
    padding: 4px 13px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }
  .badge-orange {
    background: var(--orange-dim);
    color: var(--orange);
    border: 1px solid var(--orange-glow);
  }
  .badge-teal {
    background: var(--teal-dim);
    color: var(--teal);
    border: 1px solid var(--teal-glow);
  }
  .cta-card h3 {
    font-family: var(--font-display);
    font-size: 1.48rem;
    font-weight: 700;
    line-height: 1.28;
    color: var(--text-1);
    margin-bottom: 14px;
    letter-spacing: -0.02em;
  }
  .cta-card p {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text-2);
    margin-bottom: 34px;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: var(--orange);
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px var(--orange-glow);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .btn-primary:hover {
    background: #d95618;
    transform: translateY(-1px);
    box-shadow: 0 8px 32px var(--orange-glow);
  }
  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: transparent;
    color: var(--teal);
    font-weight: 600;
    font-size: 0.9rem;
    border: 1px solid rgba(0, 176, 155, 0.4);
    border-radius: 100px;
    text-decoration: none;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s;
  }
  .btn-outline:hover {
    background: var(--teal-dim);
    border-color: var(--teal);
    transform: translateY(-1px);
  }

  /* ════════════════════════════════════
     FOOTER
  ════════════════════════════════════ */
  footer {
    background: var(--ink);
    border-top: 1px solid var(--rim);
    padding: 80px 2rem 0;
  }

  /*
    5 content columns: brand | product | company | legal | resources
    + 1 bottom bar row that spans all 5
  */
  .footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
    gap: 48px;
    padding-bottom: 0;
  }

  .footer-brand {
    grid-column: 1;
  }

  .footer-logo {
    display: block;
    font-family: var(--font-display);
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin-bottom: 14px;
  }
  .footer-logo span {
    color: var(--orange);
  }

  .footer-tagline {
    font-size: 0.875rem;
    line-height: 1.72;
    color: var(--text-3);
    max-width: 240px;
    margin-bottom: 28px;
  }
  .footer-socials {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .social-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--rim);
    border: 1px solid var(--rim-2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--text-2);
    transition:
      background 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .social-btn:hover {
    background: var(--orange-dim);
    border-color: var(--orange-glow);
    color: var(--orange);
    transform: translateY(-2px);
  }

  .footer-col h6 {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 20px;
  }
  .footer-col a {
    display: block;
    margin-bottom: 11px;
    font-size: 0.875rem;
    color: var(--text-2);
    text-decoration: none;
    transition:
      color 0.2s,
      transform 0.15s;
  }
  .footer-col a:hover {
    color: var(--text-1);
  }

  /* Full-width bottom bar */
  .footer-bottom {
    grid-column: 1 / -1; /* spans all 5 columns */
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 24px 0 28px;
    border-top: 1px solid var(--rim);
    margin-top: 8px;
  }
  .footer-bottom p {
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .footer-bottom-links {
    display: flex;
    gap: 20px;
  }
  .footer-bottom-links a {
    font-size: 0.78rem;
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .footer-bottom-links a:hover {
    color: var(--text-2);
  }

  /* ════════════════════════════════════
     RESPONSIVE
  ════════════════════════════════════ */
  @media (max-width: 1200px) {
    .footer-inner {
      grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr;
      gap: 32px;
    }
  }

  @media (max-width: 1024px) {
    .desktop-nav {
      display: none;
    }
    .hamburger {
      display: flex;
    }

    .cta-grid {
      grid-template-columns: 1fr;
    }

    /* 3-col footer on tablet: brand spans 3, then cols pair up */
    .footer-inner {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 36px;
    }
    .footer-brand {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 640px) {
    .footer-inner {
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }
    .footer-brand {
      grid-column: 1 / -1;
    }
    .cta-card {
      padding: 36px 28px;
    }
    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
