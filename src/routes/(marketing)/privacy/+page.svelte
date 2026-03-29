<!-- src/routes/(marketing)/privacy/+page.svelte -->
<!--
  Privacy Policy page for Matatu Pulse
  Premium design matching onboarding page
-->
<script lang="ts">
  import { fade } from "svelte/transition"

  // Last updated date
  const lastUpdated = "March 29, 2026"
</script>

<svelte:head>
  <title>Privacy Policy — Matatu Pulse</title>
  <meta
    name="description"
    content="Learn how Matatu Pulse collects, uses, and protects your personal information."
  />
</svelte:head>

<div class="legal-container">
  <div class="legal-header">
    <div class="eyebrow">Legal & Compliance</div>
    <h1 class="title">Privacy <em>Policy</em></h1>
    <p class="subtitle">
      Last updated: <strong>{lastUpdated}</strong>
    </p>
    <div class="header-line" aria-hidden="true"></div>
  </div>

  <div class="legal-content" in:fade={{ duration: 200 }}>
    <!-- Introduction -->
    <section class="legal-section">
      <h2 class="section-title">1. Introduction</h2>
      <p>
        Welcome to Matatu Pulse ("we," "our," or "us"). We are committed to
        protecting your personal information and your right to privacy. This
        Privacy Policy explains how we collect, use, disclose, and safeguard
        your information when you use our mobile application and services.
      </p>
      <p>
        Please read this privacy policy carefully. If you do not agree with the
        terms of this privacy policy, please do not access the application.
      </p>
    </section>

    <!-- Information We Collect -->
    <section class="legal-section">
      <h2 class="section-title">2. Information We Collect</h2>

      <h3 class="subsection-title">2.1 Personal Information</h3>
      <p>
        We collect personal information that you voluntarily provide to us when
        you:
      </p>
      <ul>
        <li>Register as a passenger or other user role</li>
        <li>Book seats or pay for fares</li>
        <li>Contact our support team</li>
        <li>Participate in surveys or promotions</li>
      </ul>
      <p>This may include:</p>
      <ul>
        <li>
          <strong>Identity Data:</strong> Full name, government ID number, date of
          birth
        </li>
        <li>
          <strong>Contact Data:</strong> Email address, phone number, physical address
        </li>
        <li>
          <strong>Financial Data:</strong> Payment card details (processed securely
          via our payment partners)
        </li>
        <li>
          <strong>Profile Data:</strong> Username, password, preferences, feedback
        </li>
      </ul>

      <h3 class="subsection-title">2.2 Location Data</h3>
      <p>
        For passengers: We collect your location data when you use our booking
        features to find nearby matatus and track your journey.
      </p>
      <p>
        For drivers/operators: We collect continuous location data during
        operational hours for route optimization, safety monitoring, and service
        delivery.
      </p>

      <h3 class="subsection-title">2.3 Technical Data</h3>
      <p>
        We automatically collect certain information when you visit, use, or
        navigate our application:
      </p>
      <ul>
        <li>
          <strong>Device Data:</strong> Device type, operating system, unique device
          identifiers
        </li>
        <li>
          <strong>Usage Data:</strong> IP address, browser type, pages visited, time
          spent
        </li>
        <li>
          <strong>App Performance Data:</strong> Crash reports, performance metrics
        </li>
      </ul>
    </section>

    <!-- How We Use Your Information -->
    <section class="legal-section">
      <h2 class="section-title">3. How We Use Your Information</h2>
      <p>
        We use personal information collected via our application for a variety
        of business purposes:
      </p>

      <div class="usage-grid">
        <div class="usage-card">
          <div class="usage-icon" style="color: var(--teal)">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h4>Service Delivery</h4>
          <p>Process bookings, manage accounts, and provide customer support</p>
        </div>

        <div class="usage-card">
          <div class="usage-icon" style="color: var(--orange)">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </div>
          <h4>Safety & Security</h4>
          <p>Verify identities, prevent fraud, and ensure platform safety</p>
        </div>

        <div class="usage-card">
          <div class="usage-icon" style="color: #a78bfa">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          </div>
          <h4>Analytics</h4>
          <p>
            Improve our services, develop new features, and optimize performance
          </p>
        </div>

        <div class="usage-card">
          <div class="usage-icon" style="color: #38bdf8">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              />
            </svg>
          </div>
          <h4>Communication</h4>
          <p>
            Send service updates, booking confirmations, and important notices
          </p>
        </div>
      </div>
    </section>

    <!-- Data Sharing -->
    <section class="legal-section">
      <h2 class="section-title">4. Data Sharing & Disclosure</h2>
      <p>
        We may share information we have collected about you in certain
        situations:
      </p>

      <h3 class="subsection-title">4.1 With Your Consent</h3>
      <p>
        We may disclose your personal information for any other purpose with
        your consent.
      </p>

      <h3 class="subsection-title">4.2 Service Providers</h3>
      <p>
        We may share your data with third-party vendors who perform services for
        us, including:
      </p>
      <ul>
        <li>Payment processing (M-Pesa, card processors)</li>
        <li>Cloud storage and hosting</li>
        <li>Analytics and monitoring services</li>
        <li>Customer support platforms</li>
      </ul>

      <h3 class="subsection-title">4.3 SACCOs & Organisations</h3>
      <p>
        If you are a driver, conductor, or other role within a SACCO, we share
        necessary operational data with your registered organization for fleet
        management and coordination.
      </p>

      <h3 class="subsection-title">4.4 Legal Requirements</h3>
      <p>
        We may disclose your information where required to do so by law or in
        response to valid requests by public authorities.
      </p>
    </section>

    <!-- Data Security -->
    <section class="legal-section">
      <h2 class="section-title">5. Data Security</h2>
      <p>
        We have implemented appropriate technical and organizational security
        measures designed to protect the security of any personal information we
        process. However, despite our safeguards and efforts to secure your
        information, no electronic transmission over the Internet or information
        storage technology can be guaranteed to be 100% secure.
      </p>

      <div class="security-features">
        <div class="security-badge">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          End-to-end encryption
        </div>
        <div class="security-badge">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Access controls
        </div>
        <div class="security-badge">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          Regular audits
        </div>
      </div>
    </section>

    <!-- Your Rights -->
    <section class="legal-section">
      <h2 class="section-title">6. Your Privacy Rights</h2>
      <p>
        Depending on your location, you may have the following rights regarding
        your personal information:
      </p>

      <div class="rights-grid">
        <div class="right-card">
          <h4>Access & Portability</h4>
          <p>Request access to and receive a copy of your personal data</p>
        </div>

        <div class="right-card">
          <h4>Correction</h4>
          <p>Request correction of inaccurate or incomplete information</p>
        </div>

        <div class="right-card">
          <h4>Deletion</h4>
          <p>
            Request deletion of your personal information under certain
            conditions
          </p>
        </div>

        <div class="right-card">
          <h4>Withdraw Consent</h4>
          <p>Withdraw your consent at any time where we rely on it</p>
        </div>
      </div>

      <p class="note">
        To exercise these rights, please contact us at <a
          href="mailto:privacy@matatupulse.com">privacy@matatupulse.com</a
        >. We will respond to your request within 30 days.
      </p>
    </section>

    <!-- Data Retention -->
    <section class="legal-section">
      <h2 class="section-title">7. Data Retention</h2>
      <p>
        We will only keep your personal information for as long as it is
        necessary for the purposes set out in this privacy policy, unless a
        longer retention period is required or permitted by law.
      </p>
      <ul>
        <li>
          <strong>Account Data:</strong> Retained while your account is active and
          for 3 years after deactivation
        </li>
        <li>
          <strong>Transaction Data:</strong> Retained for 7 years for tax and legal
          compliance
        </li>
        <li>
          <strong>Location Data:</strong> Retained for 30 days for operational purposes
        </li>
      </ul>
    </section>

    <!-- Policy Updates -->
    <section class="legal-section">
      <h2 class="section-title">8. Policy Updates</h2>
      <p>
        We may update this privacy policy from time to time. The updated version
        will be indicated by an updated "Last updated" date and the updated
        version will be effective as soon as it is accessible. We encourage you
        to review this privacy policy frequently to be informed of how we are
        protecting your information.
      </p>
    </section>

    <!-- Contact -->
    <section class="legal-section">
      <h2 class="section-title">9. Contact Us</h2>
      <p>
        If you have questions or comments about this policy, you may contact us
        at:
      </p>

      <div class="contact-card">
        <div class="contact-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div class="contact-info">
          <strong>Email:</strong>
          <a href="mailto:privacy@matatupulse.com">privacy@matatupulse.com</a
          ><br />
          <strong>Address:</strong> Data Protection Officer, Matatu Pulse Ltd, Nairobi,
          Kenya
        </div>
      </div>
    </section>

    <div class="legal-footer">
      <p>© {new Date().getFullYear()} Matatu Pulse Ltd. All rights reserved.</p>
      <a href="/terms" class="legal-link">View Terms & Conditions →</a>
    </div>
  </div>
</div>

<style>
  .legal-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .legal-header {
    margin-bottom: 40px;
    position: relative;
  }

  .eyebrow {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
  }

  .title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 0.875rem;
    color: var(--text-3);
    margin-bottom: 20px;
  }

  .subtitle strong {
    color: var(--text-2);
    font-weight: 600;
  }

  .header-line {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.4),
      transparent
    );
  }

  /* Legal Content */
  .legal-content {
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .legal-section {
    margin-bottom: 40px;
  }

  .legal-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-1);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .subsection-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-2);
    margin: 20px 0 10px 0;
  }

  p {
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--text-3);
    margin-bottom: 16px;
  }

  ul {
    margin: 12px 0 20px 20px;
    padding: 0;
  }

  li {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-3);
    margin-bottom: 8px;
    position: relative;
  }

  li::before {
    content: "•";
    color: var(--orange);
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-left: -1em;
  }

  li strong {
    color: var(--text-2);
    font-weight: 600;
  }

  /* Usage Grid */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .usage-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 20px;
    transition:
      transform 0.2s,
      border-color 0.2s;
  }

  .usage-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .usage-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .usage-card h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .usage-card p {
    font-size: 0.75rem;
    margin-bottom: 0;
    line-height: 1.5;
  }

  /* Security Features */
  .security-features {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 20px 0;
  }

  .security-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 12px;
    border-radius: 100px;
  }

  /* Rights Grid */
  .rights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }

  .right-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 16px;
  }

  .right-card h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .right-card p {
    font-size: 0.75rem;
    margin-bottom: 0;
    line-height: 1.5;
  }

  .note {
    font-size: 0.8rem;
    background: rgba(0, 176, 155, 0.05);
    border-left: 3px solid var(--teal);
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin-top: 20px;
  }

  .note a {
    color: var(--teal);
    text-decoration: none;
    font-weight: 600;
  }

  .note a:hover {
    text-decoration: underline;
  }

  /* Contact Card */
  .contact-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    margin-top: 16px;
  }

  .contact-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }

  .contact-info {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text-3);
  }

  .contact-info strong {
    color: var(--text-2);
    font-weight: 600;
  }

  .contact-info a {
    color: var(--orange);
    text-decoration: none;
  }

  .contact-info a:hover {
    text-decoration: underline;
  }

  /* Legal Footer */
  .legal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 30px;
    margin-top: 40px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .legal-footer p {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-bottom: 0;
  }

  .legal-link {
    font-size: 0.8rem;
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .legal-link:hover {
    opacity: 0.8;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .legal-container {
      padding: 20px 16px;
    }

    .legal-content {
      padding: 24px;
    }

    .usage-grid,
    .rights-grid {
      grid-template-columns: 1fr;
    }

    .legal-footer {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }

    .contact-card {
      flex-direction: column;
      text-align: center;
      gap: 12px;
    }
  }

  @media (max-width: 480px) {
    .legal-content {
      padding: 20px 16px;
    }

    .section-title {
      font-size: 1.1rem;
    }

    .security-features {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
