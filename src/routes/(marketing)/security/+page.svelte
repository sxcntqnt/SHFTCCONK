<script lang="ts">
</script>

<svelte:head>
  <title
    >Security Infrastructure & Vulnerability Disclosure — Matatu Pulse</title
  >

  <meta
    name="description"
    content="Matatu Pulse Vulnerability Disclosure Program. Scope, technical controls, and coordinated disclosure policy for security researchers."
  />

  <meta
    property="og:title"
    content="Security Infrastructure & Vulnerability Disclosure — Matatu Pulse"
  />
</svelte:head>

<div class="page">
  <!-- Quick Reference Hero -->

  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Vulnerability Disclosure Program</div>

      <h1>Security Infrastructure<br />& Coordinated Disclosure</h1>

      <p class="hero-sub">
        We welcome good-faith security research that helps harden Matatu Pulse
        and the Nairobi matatu transit ecosystem.
      </p>

      <div class="quick-grid">
        <div class="quick-card">
          <h3>Primary Contact</h3>
          <a href="mailto:security@sxcntcnqunts.org" class="mono"
            >security@sxcntcnqunts.org</a
          >
        </div>
        <div class="quick-card">
          <h3>security.txt</h3>
          <a
            href="https://sxcntcnqunts.org/.well-known/security.txt"
            target="_blank"
            rel="noopener"
            class="mono link"
            >https://sxcntcnqunts.org/.well-known/security.txt</a
          >
          <p class="small">
            RFC 9116 compliant • Preferred contact & policy details
          </p>
        </div>
        <div class="quick-card">
          <h3>Program Scope</h3>
          <ul class="scope-list">
            <li>*.sxcntcnqunts.org</li>
            <li>Matatu Pulse Android & iOS production apps</li>
            <li>Public APIs serving live matatu transit data</li>
          </ul>
        </div>
        <div class="quick-card">
          <h3>Encryption Identity</h3>
          <div class="pgp-box no-border">
            <span class="pgp-label">PGP Fingerprint</span>
            <code class="pgp-code">4F3E 9A12 B7D5 6621 8C01 4410 99AB F231</code
            >

            <div class="pgp-actions">
              <a href="/security-key.asc" class="pgp-link">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  ><path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  /><polyline points="7 10 12 15 17 10" /><line
                    x1="12"
                    y1="15"
                    x2="12"
                    y2="3"
                  /></svg
                >
                Public Key
              </a>
              <span class="divider">•</span>
              <span class="small">Expires: Jan 2027</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <a href="#disclosure" class="btn-primary">Submit Report</a>

        <a
          href="https://sxcntcnqunts.org/.well-known/security.txt"
          target="_blank"
          rel="noopener"
          class="btn-ghost">View security.txt</a
        >
      </div>
    </div>
  </section>

  <!-- Technical Controls -->

  <section class="section">
    <div class="inner">
      <span class="section-tag">Attack Surface</span>

      <h2 class="section-title">Security Architecture & Controls</h2>

      <p class="section-sub">Key hardening measures and design decisions.</p>

      <div class="tech-grid">
        {#each [{ title: "Client-Side Encryption & Storage", desc: "Local trip history and cached routes use AES-256 encryption via platform secure storage (Keystore/Keychain). Ephemeral processing for live GPS sessions.", stack: "Svelte + Capacitor • Encrypted IndexedDB/SQLite" }, { title: "Transport & Network Security", desc: "TLS 1.3 enforced everywhere with HSTS. Certificate pinning in mobile clients to defend against MITM on public Wi-Fi and matatu networks.", stack: "TLS 1.3 • Certificate Pinning • Strict CORS" }, { title: "API & Authentication", desc: "JWT with short-lived tokens and scoped permissions. Rate limiting, input validation, and protection against IDOR/mass assignment on sacco integrations.", stack: "OAuth2 scoped tokens • Rate limiting" }] as t}
          <div class="tech-card">
            <div class="tech-title">{t.title}</div>

            <p class="tech-desc">{t.desc}</p>

            <div class="tech-stack">{t.stack}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Hardening Table -->

  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Trust Model</span>

      <h2 class="section-title">Data Handling & System Hardening</h2>

      <p class="section-sub" style="margin-bottom: 52px;">
        Summary of sensitive surfaces and corresponding controls.
      </p>

      <table class="hardening-table">
        <thead>
          <tr><th>Surface</th><th>Defense Strategy</th></tr>
        </thead>

        <tbody>
          <tr
            ><td>User GPS & Location Data</td><td
              >Client-side E2EE + ephemeral server processing. No background
              tracking.</td
            ></tr
          >

          <tr
            ><td>Sacco & Vehicle APIs</td><td
              >OAuth2 with least-privilege scoped tokens. NTSA-linked vehicle
              verification.</td
            ></tr
          >

          <tr
            ><td>Emergency Features</td><td
              >Opt-in only with user-controlled trusted contacts.</td
            ></tr
          >

          <tr
            ><td>Mobile App Binaries</td><td
              >Runtime integrity checks and root/jailbreak detection.</td
            ></tr
          >
        </tbody>
      </table>
    </div>
  </section>

  <!-- Disclosure -->

  <section id="disclosure" class="section">
    <div class="inner">
      <span class="section-tag">Responsible Disclosure</span>

      <h2 class="section-title">Vulnerability Disclosure Policy</h2>

      <p class="section-sub" style="margin-bottom:48px;">
        Good-faith researchers acting within scope are covered by our safe
        harbor policy.
      </p>

      <div class="report-box">
        <div class="report-content">
          <h3>Reporting Guidelines</h3>

          <ul>
            <li>Clear description, reproduction steps, and impact</li>

            <li>PoC (screenshots/video/script) where safe to share</li>

            <li>Use test accounts; avoid affecting real rider data</li>
          </ul>

          <h3 style="margin-top:40px;">Out of Scope</h3>

          <ul class="out-of-scope">
            <li>Social engineering or physical attacks</li>

            <li>Automated scanner output without manual PoC</li>

            <li>Missing headers or rate limits without demonstrated impact</li>

            <li>
              Third-party services unless directly exploitable through our
              assets
            </li>
          </ul>
        </div>

        <div class="report-note">
          <h3>Recognition & Rewards</h3>

          <p>
            Valid, unique, in-scope reports receive public Hall of Fame credit,
            swag, or modest tokens of appreciation (triage dependent). We
            especially value contributions that strengthen Nairobi’s public
            transit safety.
          </p>

          <p style="margin-top:20px;">
            <strong>Initial response:</strong> within 48 hours.
          </p>
        </div>
      </div>

      <div class="reward-tiers">
        <div class="tier">
          <span class="tier-icon">🥉</span>

          <div>
            <strong>Low/Medium Impact</strong>

            <p>Hall of Fame + Swag Pack</p>
          </div>
        </div>

        <div class="tier">
          <span class="tier-icon">🥈</span>

          <div>
            <strong>High Impact</strong>

            <p>Hall of Fame + App Credits + Small Bounty</p>
          </div>
        </div>
      </div>

      <div class="safe-harbor">
        <strong>Safe Harbor:</strong> We will not pursue legal action against researchers
        who make a good-faith effort, avoid destructive testing, and allow reasonable
        time for remediation.
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-cta-inner">
      <h2>Help Secure Nairobi’s Matatu Network</h2>

      <p>
        Thank you to the researchers contributing to a more resilient platform
        for commuters.
      </p>

      <div class="hero-actions" style="justify-content:center;">
        <a href="mailto:security@sxcntcnqunts.org" class="btn-primary"
          >Contact security@sxcntcnqunts.org</a
        >

        <a
          href="https://sxcntcnqunts.org/.well-known/security.txt"
          target="_blank"
          rel="noopener"
          class="btn-ghost">View security.txt</a
        >
      </div>
    </div>
  </section>
</div>

<style>
  /* ── Matched exactly to your original Route Planner styling ── */

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

      rgba(242, 101, 34, 0.08),
      transparent 70%
    );

    pointer-events: none;
  }

  .hero-inner {
    position: relative;

    max-width: 820px;

    margin: 0 auto;
  }

  .eyebrow {
    display: inline-flex;

    align-items: center;

    gap: 7px;

    padding: 5px 14px;

    margin-bottom: 24px;

    background: rgba(242, 101, 34, 0.1);

    border: 1px solid rgba(242, 101, 34, 0.22);

    border-radius: 100px;

    font-size: 0.72rem;

    font-weight: 700;

    letter-spacing: 0.12em;

    text-transform: uppercase;

    color: var(--orange);
  }

  h1 {
    font-family: var(--font-display);

    font-size: clamp(2.1rem, 5vw, 3.4rem);

    font-weight: 800;

    letter-spacing: -0.04em;

    color: var(--text-1);

    line-height: 1.15;

    margin-bottom: 20px;
  }

  .hero-sub {
    font-size: 1.05rem;

    color: var(--text-2);

    line-height: 1.7;

    max-width: 620px;

    margin: 0 auto 48px;
  }

  .quick-grid {
    display: grid;

    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));

    gap: 20px;

    margin-bottom: 48px;
  }

  .quick-card {
    background: var(--surface);

    border: 1px solid var(--rim);

    border-radius: 16px;

    padding: 24px;

    text-align: left;
  }

  .quick-card h3 {
    font-size: 0.95rem;

    color: var(--text-1);

    margin-bottom: 12px;
  }

  .mono {
    font-family: ui-monospace, monospace;

    font-size: 0.95rem;

    color: var(--orange);
  }

  .small {
    font-size: 0.82rem;

    color: var(--text-3);

    margin-top: 8px;
  }

  .scope-list {
    list-style: none;

    padding: 0;

    margin: 0;

    color: var(--orange);
  }

  .scope-list li {
    margin-bottom: 6px;
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

    transition: all 0.2s;
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

    transition: all 0.2s;
  }

  .btn-ghost:hover {
    border-color: var(--rim);

    color: var(--text-1);

    transform: translateY(-2px);
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

  .tech-grid {
    display: grid;

    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));

    gap: 32px;
  }

  .tech-card {
    background: var(--surface);

    border: 1px solid var(--rim);

    border-radius: 16px;

    padding: 32px;
  }

  .tech-title {
    font-family: var(--font-display);

    font-size: 1.2rem;

    font-weight: 700;

    color: var(--text-1);

    margin-bottom: 16px;
  }

  .tech-desc {
    font-size: 0.93rem;

    color: var(--text-2);

    line-height: 1.75;

    margin-bottom: 20px;
  }

  .tech-stack {
    font-size: 0.82rem;

    color: var(--text-3);

    font-family: ui-monospace, monospace;

    background: rgba(242, 101, 34, 0.08);

    padding: 6px 12px;

    border-radius: 6px;

    display: inline-block;
  }

  .hardening-table {
    width: 100%;

    border-collapse: collapse;

    background: var(--surface);

    border: 1px solid var(--rim);

    border-radius: 16px;

    overflow: hidden;
  }

  .hardening-table th,
  .hardening-table td {
    padding: 20px 28px;

    text-align: left;

    border-bottom: 1px solid var(--rim);
  }

  .hardening-table th {
    background: rgba(242, 101, 34, 0.06);

    font-weight: 600;

    color: var(--text-1);
  }

  .hardening-table tr:last-child td {
    border-bottom: none;
  }

  /* 1. Subtle Background Grain (Premium Texture) */

  .page::before {
    content: "";

    position: fixed;

    inset: 0;

    background-image: url("https://grainy-gradients.vercel.app/noise.svg");

    opacity: 0.03;

    pointer-events: none;

    z-index: 10;
  }

  /* 2. Glass Cards with Glow */

  .quick-card,
  .tech-card,
  .report-box {
    background: rgba(255, 255, 255, 0.02); /* Very subtle white */

    backdrop-filter: blur(10px);

    border: 1px solid rgba(255, 255, 255, 0.08); /* Transparent border */

    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);

    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .quick-card:hover,
  .tech-card:hover {
    border-color: rgba(242, 101, 34, 0.4);

    transform: translateY(-4px);

    background: rgba(255, 255, 255, 0.04);
  }

  /* 3. Terminal-style Code Blocks for Scope */

  .mono {
    background: #000;

    padding: 2px 6px;

    border-radius: 4px;

    border: 1px solid var(--rim-2);

    color: var(--orange);

    font-weight: 500;
  }

  /* 4. The Hardening Table - Clean & Dark */

  .hardening-table {
    border-radius: 12px;

    border: 1px solid var(--rim);
  }

  .hardening-table th {
    text-transform: uppercase;

    font-size: 0.75rem;

    letter-spacing: 0.1em;

    color: var(--text-3);

    background: rgba(0, 0, 0, 0.3);
  }

  .hardening-table td {
    font-size: 0.9rem;
  }

  /* 5. Glowing Section Tags */

  .section-tag {
    background: linear-gradient(90deg, rgba(242, 101, 34, 0.2), transparent);

    border-left: 2px solid var(--orange);

    border-radius: 0 100px 100px 0; /* Only right side rounded */

    padding: 6px 16px;
  }

  .report-box {
    background: var(--surface);

    border: 1px solid var(--rim);

    border-radius: 20px;

    padding: 48px;

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 64px;
  }

  .report-content h3 {
    font-family: var(--font-display);

    font-size: 1.25rem;

    color: var(--text-1);

    margin-bottom: 16px;
  }

  .report-content ul,
  .out-of-scope {
    padding-left: 20px;

    line-height: 1.75;
  }

  .report-content li,
  .out-of-scope li {
    margin-bottom: 10px;

    color: var(--text-2);
  }

  .out-of-scope li {
    color: var(--orange);
  }

  .report-note {
    background: rgba(242, 101, 34, 0.06);

    border: 1px solid rgba(242, 101, 34, 0.25);

    padding: 32px;

    border-radius: 16px;
  }

  .safe-harbor {
    margin-top: 48px;

    padding: 20px 28px;

    background: var(--surface);

    border-left: 4px solid var(--orange);

    font-size: 0.95rem;

    color: var(--text-2);
  }

  .final-cta {
    padding: 100px 2rem;

    text-align: center;

    position: relative;

    overflow: hidden;
  }

  .final-cta h2 {
    font-family: var(--font-display);

    font-size: clamp(1.8rem, 4vw, 2.8rem);

    font-weight: 800;

    letter-spacing: -0.03em;

    color: var(--text-1);

    margin-bottom: 16px;
  }

  .final-cta p {
    color: var(--text-2);

    max-width: 520px;

    margin: 0 auto 36px;
  }
  /* Removes the top border since there's no email above it now */
  .pgp-box.no-border {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .pgp-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }

  .divider {
    color: var(--rim-2);
    font-size: 0.8rem;
  }

  .pgp-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .pgp-link:hover {
    color: var(--text-1);
  }

  /* Make the code look like a secure chip */
  .pgp-code {
    display: block;
    font-family: ui-monospace, monospace;
    font-size: 0.7rem;
    color: var(--text-2);
    background: #000; /* Deep black for contrast */
    padding: 10px;
    border-radius: 8px;
    border: 1px solid var(--rim-2);
    word-break: break-all;
    line-height: 1.6;
    letter-spacing: 0.05em;
  }
  .reward-tiers {
    display: flex;

    flex-direction: column;

    gap: 16px;

    margin-top: 24px;
  }

  .tier {
    display: flex;

    align-items: center;

    gap: 18px;

    padding: 16px 20px;

    background: rgba(0, 0, 0, 0.2);

    border: 1px solid var(--rim);

    border-radius: 12px;

    transition: all 0.2s ease;
  }

  /* Subtly highlight on hover to make it feel interactive */

  .tier:hover {
    border-color: rgba(242, 101, 34, 0.3);

    background: rgba(242, 101, 34, 0.04);

    transform: translateX(4px);
  }

  .tier-icon {
    font-size: 1.5rem;

    filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.5));

    flex-shrink: 0;
  }

  .tier strong {
    display: block;

    font-size: 0.9rem;

    color: var(--text-1);

    letter-spacing: -0.01em;

    margin-bottom: 2px;
  }

  .tier p {
    font-size: 0.82rem;

    color: var(--text-3);

    margin: 0;

    line-height: 1.4;
  }

  /* Special accent for the "High Impact" tier */

  .tier:last-child {
    border-left: 3px solid var(--orange);
  }

  /* Responsive adjustment for mobile */

  @media (max-width: 600px) {
    .tier {
      padding: 12px 16px;

      gap: 14px;
    }

    .tier-icon {
      font-size: 1.2rem;
    }
  }

  @media (max-width: 900px) {
    .quick-grid,
    .tech-grid,
    .report-box {
      grid-template-columns: 1fr;

      gap: 24px;
    }

    .report-box {
      padding: 32px;
    }
  }

  @media (max-width: 600px) {
    .hero {
      padding: 72px 1.25rem 64px;
    }

    .section {
      padding: 64px 1.25rem;
    }
  }
</style>
