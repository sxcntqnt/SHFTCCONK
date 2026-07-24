<script lang="ts">
  import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public"
  import TurnstileWidget from "$lib/components/TurnstileWidget.svelte"
  import { page } from "$app/state"

  let { data } = $props<{ data: { csrfToken?: string } }>()
</script>

<svelte:head>
  <title>Contact — Matatu Pulse | Get in Touch</title>
  <meta
    name="description"
    content="Contact the Matatu Pulse team. Reach us for operator demos, partnership enquiries, press, technical support, or general questions about our Nairobi matatu tracking platform."
  />
  <link rel="canonical" href="https://sxcntcnqunts.org/contact_us" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Contact</div>
      <h1>Let's Talk About<br /><em>What You Need</em></h1>
      <p class="hero-sub">
        Whether you're a commuter with a question, a sacco manager exploring a
        pilot, or a journalist on deadline — we respond to everything.
      </p>
    </div>
  </section>

  <section class="section">
    <div class="inner">
      <div class="contact-layout">
        <!-- Sidebar -->
        <div class="contact-sidebar">
          <div class="sidebar-heading">How can we help?</div>

          {#each [{ title: "Operator Demo", desc: "See the fleet dashboard live on your routes. Demos take 30 minutes via video call.", link: "Schedule a Demo", href: "/contact_us?type=demo", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>` }, { title: "Partnerships & Saccos", desc: "Join our partner network. We'll assess your fleet size and routes and design a deployment plan.", link: "Enquire Now", href: "/contact_us?type=partnership", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }, { title: "Press & Media", desc: "We respond to media enquiries within 4 hours on business days. Data, spokespeople, and imagery available.", link: "Contact Press Team", href: "/press", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/></svg>` }, { title: "Technical Support", desc: "Existing partner or API user? Reach our technical team directly at support@matatupulse.co.ke.", link: "support@matatupulse.co.ke", href: "mailto:support@matatupulse.co.ke", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` }, { title: "General Enquiries", desc: "Anything else? Use the form or email us directly at hello@matatupulse.co.ke.", link: "hello@matatupulse.co.ke", href: "mailto:hello@matatupulse.co.ke", icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` }] as o}
            <div class="contact-option">
              <div class="contact-icon">{@html o.icon}</div>
              <div>
                <div class="contact-opt-title">{o.title}</div>
                <p class="contact-opt-desc">{o.desc}</p>
                <a href={o.href} class="contact-opt-link">{o.link} →</a>
              </div>
            </div>
          {/each}
        </div>

        <!-- Form -->
        <div class="contact-form-wrap">
          <div class="form-title">Send Us a Message</div>
          <p class="form-sub">
            We read and respond to every message. Typical response time is under
            4 hours on business days.
          </p>

          <form method="POST">
            <input type="hidden" name="csrf-token" value={data.csrfToken} />
            <div class="form-grid">
              <div class="form-group">
                <label for="first">First Name</label>
                <input
                  id="first"
                  name="first"
                  type="text"
                  placeholder="Amara"
                  required
                />
              </div>
              <div class="form-group">
                <label for="last">Last Name</label>
                <input
                  id="last"
                  name="last"
                  type="text"
                  placeholder="Odhiambo"
                  required
                />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="amara@example.com"
                  required
                />
              </div>
              <div class="form-group">
                <label for="phone">Phone (optional)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
              <div class="form-group full">
                <label for="type">What's this about?</label>
                <select id="type" name="type">
                  <option value="">Select a topic</option>
                  <option>Operator / Sacco Demo</option>
                  <option>Partnership Enquiry</option>
                  <option>Press / Media</option>
                  <option>Technical Support</option>
                  <option>API / Developer Access</option>
                  <option>Rider Question</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="form-group full">
                <label for="org">Organisation (optional)</label>
                <input
                  id="org"
                  name="org"
                  type="text"
                  placeholder="Sacco name, company, or publication"
                />
              </div>
              <div class="form-group full">
                <label for="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us what you're working on or what you need..."
                  required
                ></textarea>
              </div>
            </div>

            <!-- Turnstile widget -->
            <div
              class="cf-turnstile"
              data-sitekey={PUBLIC_TURNSTILE_SITE_KEY}
            ></div>
            <button type="submit" class="submit-btn">
              Send Message
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
              >
            </button>
            <p class="form-note">
              We'll never share your information with third parties.
            </p>
          </form>
        </div>
      </div>

      <!-- Offices -->
      <div>
        <h3
          style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--text-3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0;margin-top:64px;"
        >
          Find Us
        </h3>
        <div class="offices-grid">
          {#each [{ city: "Nairobi", label: "Headquarters", addr: "Westlands Business Park\n2nd Floor, Ring Road Westlands\nNairobi, Kenya\n\nhello@matatupulse.co.ke" }, { city: "Operations", label: "Hardware & Fleet", addr: "Industrial Area\nEnterprise Road\nNairobi, Kenya\n\nops@matatupulse.co.ke" }, { city: "Remote", label: "Distributed Team", addr: "Engineering and data team members work remotely across Nairobi, Mombasa, and Kisumu.\n\nAll enquiries via hello@matatupulse.co.ke" }] as o}
            <div class="office-card">
              <div class="office-city">{o.city}</div>
              <div class="office-label">{o.label}</div>
              <p class="office-address" style="white-space:pre-line;">
                {o.addr}
              </p>
            </div>
          {/each}
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
    max-width: 640px;
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
    margin: 0 auto;
  }

  .section {
    padding: 88px 2rem;
  }
  .inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ── CONTACT GRID ── */
  .contact-layout {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 64px;
    align-items: start;
  }

  .contact-sidebar {
  }
  .sidebar-heading {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 20px;
    letter-spacing: -0.02em;
  }
  .contact-option {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 18px 0;
    border-bottom: 1px solid var(--rim);
  }
  .contact-option:last-child {
    border-bottom: none;
  }
  .contact-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }
  .contact-opt-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .contact-opt-desc {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 6px;
  }
  .contact-opt-link {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--orange);
    text-decoration: none;
  }
  .contact-opt-link:hover {
    text-decoration: underline;
  }

  /* ── FORM ── */
  .contact-form-wrap {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    padding: 40px 36px;
    position: relative;
    overflow: hidden;
  }
  .contact-form-wrap::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--rim-2), transparent);
  }

  .form-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  .form-sub {
    font-size: 0.85rem;
    color: var(--text-2);
    margin-bottom: 28px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-group.full {
    grid-column: span 2;
  }
  label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: 0.03em;
  }
  input,
  select,
  textarea {
    background: var(--ink-2);
    border: 1px solid var(--rim-2);
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 0.875rem;
    color: var(--text-1);
    font-family: var(--font-body);
    width: 100%;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    outline: none;
    resize: vertical;
  }
  input:focus,
  select:focus,
  textarea:focus {
    border-color: rgba(242, 101, 34, 0.5);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--text-3);
  }
  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B6880' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }
  textarea {
    min-height: 120px;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 8px;
    padding: 13px;
    background: var(--orange);
    color: #fff;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.3);
    transition:
      background 0.2s,
      box-shadow 0.2s,
      transform 0.15s;
  }
  .submit-btn:hover {
    background: #d95618;
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.4);
  }
  .form-note {
    font-size: 0.72rem;
    color: var(--text-3);
    text-align: center;
    margin-top: 12px;
  }

  /* ── OFFICES ── */
  .offices-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 48px;
  }
  .office-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 28px 24px;
  }
  .office-city {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .office-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 14px;
  }
  .office-address {
    font-size: 0.845rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  @media (max-width: 900px) {
    .contact-layout {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .offices-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    .form-group.full {
      grid-column: span 1;
    }
    .offices-grid {
      grid-template-columns: 1fr;
    }
    .contact-form-wrap {
      padding: 28px 20px;
    }
    .section {
      padding: 64px 1.25rem;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
  }
</style>
