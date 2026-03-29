<!-- src/routes/(marketing)/terms/+page.svelte -->
<!--
  Terms & Conditions page for Matatu Pulse
  Premium design matching onboarding page
-->
<script lang="ts">
  import { fade } from "svelte/transition"

  // Last updated date
  const lastUpdated = "March 29, 2026"
</script>

<svelte:head>
  <title>Terms & Conditions — Matatu Pulse</title>
  <meta
    name="description"
    content="Read the terms and conditions for using Matatu Pulse services."
  />
</svelte:head>

<div class="legal-container">
  <div class="legal-header">
    <div class="eyebrow">Legal & Compliance</div>
    <h1 class="title">Terms & <em>Conditions</em></h1>
    <p class="subtitle">
      Last updated: <strong>{lastUpdated}</strong>
    </p>
    <div class="header-line" aria-hidden="true"></div>
  </div>

  <div class="legal-content" in:fade={{ duration: 200 }}>
    <!-- Agreement to Terms -->
    <section class="legal-section">
      <h2 class="section-title">1. Agreement to Terms</h2>
      <p>
        These Terms and Conditions ("Terms") constitute a legally binding
        agreement between you ("User," "you," or "your") and Matatu Pulse Ltd
        ("Company," "we," "us," or "our"). By accessing and using the Matatu
        Pulse application and services, you acknowledge that you have read,
        understood, and agree to be bound by all the terms and conditions
        contained herein.
      </p>
      <p>
        If you do not agree with any part of these Terms, you must not use our
        services. We reserve the right to modify these Terms at any time. Your
        continued use of the application following the posting of revised Terms
        means that you accept and agree to the changes.
      </p>
    </section>

    <!-- User Eligibility -->
    <section class="legal-section">
      <h2 class="section-title">2. User Eligibility</h2>
      <p>By using Matatu Pulse, you represent and warrant that:</p>
      <ul>
        <li>
          You are at least 18 years of age or the legal age of majority in your
          jurisdiction
        </li>
        <li>You have the legal capacity to enter into this agreement</li>
        <li>You are not prohibited by law from using our services</li>
        <li>All information you provide is accurate, current, and complete</li>
        <li>You will comply with all applicable laws and regulations</li>
      </ul>
      <p>
        We reserve the right to refuse service, terminate accounts, or cancel
        orders at our sole discretion if we believe you violate these Terms or
        applicable laws.
      </p>
    </section>

    <!-- User Accounts -->
    <section class="legal-section">
      <h2 class="section-title">3. User Accounts & Registration</h2>

      <h3 class="subsection-title">3.1 Account Creation</h3>
      <p>
        To use certain features of Matatu Pulse, you must create an account. You
        agree to provide accurate, truthful, and complete information during
        registration and to keep this information updated.
      </p>

      <h3 class="subsection-title">3.2 Account Security</h3>
      <p>You are responsible for:</p>
      <ul>
        <li>
          Maintaining the confidentiality of your password and account
          credentials
        </li>
        <li>All activities that occur under your account</li>
        <li>Notifying us immediately of any unauthorized access or use</li>
      </ul>
      <p>
        We are not liable for any loss or damage arising from your failure to
        protect your account information.
      </p>

      <h3 class="subsection-title">3.3 Identity Verification</h3>
      <p>
        Passengers and certain user roles are required to complete identity
        verification (KYC) as part of our compliance obligations. You authorize
        us to verify your identity through government-issued documents and other
        means.
      </p>
    </section>

    <!-- User Roles & Responsibilities -->
    <section class="legal-section">
      <h2 class="section-title">4. User Roles & Responsibilities</h2>

      <h3 class="subsection-title">4.1 Passengers</h3>
      <p>As a passenger, you agree to:</p>
      <ul>
        <li>Use the booking system only for legitimate travel purposes</li>
        <li>Comply with all matatu operators' rules and regulations</li>
        <li>Treat drivers, conductors, and other passengers with respect</li>
        <li>Not engage in illegal, harmful, or disruptive behavior</li>
        <li>Pay fares as agreed through the platform</li>
      </ul>

      <h3 class="subsection-title">4.2 Drivers & Conductors</h3>
      <p>If you are a driver or conductor, you agree to:</p>
      <ul>
        <li>Maintain valid driving licenses and vehicle documentation</li>
        <li>Operate vehicles safely and in compliance with traffic laws</li>
        <li>Provide professional and courteous service to passengers</li>
        <li>Maintain accurate location tracking during operational hours</li>
        <li>Report any incidents or accidents immediately</li>
        <li>Not operate under the influence of alcohol or drugs</li>
      </ul>

      <h3 class="subsection-title">4.3 SACCO Operators & Organisations</h3>
      <p>If you represent a SACCO or organization, you agree to:</p>
      <ul>
        <li>Provide accurate fleet and operational information</li>
        <li>Ensure all drivers and conductors comply with these Terms</li>
        <li>Maintain valid business registration and licenses</li>
        <li>Manage your organization's account responsibly</li>
        <li>Comply with all regulatory requirements</li>
      </ul>
    </section>

    <!-- Booking & Payment -->
    <section class="legal-section">
      <h2 class="section-title">5. Booking & Payment Terms</h2>

      <h3 class="subsection-title">5.1 Booking Process</h3>
      <p>
        When you book a seat through Matatu Pulse, you are entering into a
        contract with the SACCO operator. We act as a facilitator and are not a
        party to this contract. Bookings are subject to availability and
        operator confirmation.
      </p>

      <h3 class="subsection-title">5.2 Payment</h3>
      <p>
        All fares and charges must be paid through the Matatu Pulse platform
        using approved payment methods. We accept M-Pesa, card payments, and
        other digital payment methods. Payment is non-refundable except as
        provided in our cancellation policy.
      </p>

      <h3 class="subsection-title">5.3 Cancellation & Refunds</h3>
      <p>
        Cancellation policies are determined by individual SACCO operators.
        Refunds, if applicable, will be processed within 5-7 business days. We
        are not responsible for delays in refund processing by payment
        providers.
      </p>

      <h3 class="subsection-title">5.4 Pricing</h3>
      <p>
        Fares are set by SACCO operators and may vary based on route, time, and
        demand. We reserve the right to update pricing information at any time.
        You will be informed of the final fare before confirming your booking.
      </p>
    </section>

    <!-- Prohibited Conduct -->
    <section class="legal-section">
      <h2 class="section-title">6. Prohibited Conduct</h2>
      <p>You agree not to:</p>

      <div class="prohibited-grid">
        <div class="prohibited-card">
          <h4>Illegal Activities</h4>
          <p>Engage in any illegal, fraudulent, or harmful activities</p>
        </div>

        <div class="prohibited-card">
          <h4>Harassment</h4>
          <p>Harass, threaten, or abuse other users or staff members</p>
        </div>

        <div class="prohibited-card">
          <h4>Fraud</h4>
          <p>Provide false information or attempt to deceive the platform</p>
        </div>

        <div class="prohibited-card">
          <h4>Intellectual Property</h4>
          <p>Infringe on copyrights, trademarks, or other IP rights</p>
        </div>

        <div class="prohibited-card">
          <h4>Hacking</h4>
          <p>Attempt to hack, reverse-engineer, or disrupt the platform</p>
        </div>

        <div class="prohibited-card">
          <h4>Spam</h4>
          <p>Send unsolicited messages or spam through our platform</p>
        </div>
      </div>
    </section>

    <!-- Liability & Disclaimers -->
    <section class="legal-section">
      <h2 class="section-title">7. Limitation of Liability</h2>

      <h3 class="subsection-title">7.1 Service Disclaimer</h3>
      <p>
        Matatu Pulse is provided on an "AS IS" and "AS AVAILABLE" basis. We make
        no warranties, express or implied, regarding the accuracy, completeness,
        or reliability of the service. We do not guarantee that the service will
        be uninterrupted or error-free.
      </p>

      <h3 class="subsection-title">7.2 Third-Party Services</h3>
      <p>
        We are not responsible for the actions, services, or content of SACCO
        operators, drivers, conductors, or other third parties. You use
        third-party services at your own risk.
      </p>

      <h3 class="subsection-title">7.3 Limitation of Damages</h3>
      <p>
        To the maximum extent permitted by law, Matatu Pulse shall not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages arising from your use of or inability to use the service, even
        if we have been advised of the possibility of such damages.
      </p>

      <h3 class="subsection-title">7.4 Maximum Liability</h3>
      <p>
        Our total liability to you for any claim arising from these Terms or
        your use of the service shall not exceed the amount you paid to us in
        the 12 months preceding the claim.
      </p>
    </section>

    <!-- Indemnification -->
    <section class="legal-section">
      <h2 class="section-title">8. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Matatu Pulse and its
        officers, directors, employees, and agents from any claims, damages,
        losses, liabilities, and expenses (including legal fees) arising from:
      </p>
      <ul>
        <li>Your violation of these Terms</li>
        <li>Your use of the service in violation of applicable laws</li>
        <li>Your infringement of any third-party rights</li>
        <li>Any content you provide or transmit through the platform</li>
      </ul>
    </section>

    <!-- Intellectual Property -->
    <section class="legal-section">
      <h2 class="section-title">9. Intellectual Property Rights</h2>

      <h3 class="subsection-title">9.1 Our IP</h3>
      <p>
        All content, features, and functionality of Matatu Pulse (including but
        not limited to software, design, graphics, and text) are owned by Matatu
        Pulse Ltd or our licensors and are protected by international copyright,
        trademark, and other intellectual property laws.
      </p>

      <h3 class="subsection-title">9.2 Your License</h3>
      <p>
        We grant you a limited, non-exclusive, non-transferable license to use
        the Matatu Pulse application for your personal, non-commercial use. You
        may not reproduce, distribute, or transmit any content without our prior
        written permission.
      </p>

      <h3 class="subsection-title">9.3 User Content</h3>
      <p>
        Any content you submit to Matatu Pulse (reviews, feedback, etc.) becomes
        our property and may be used by us without restriction or compensation
        to you.
      </p>
    </section>

    <!-- Termination -->
    <section class="legal-section">
      <h2 class="section-title">10. Termination</h2>

      <h3 class="subsection-title">10.1 Termination by You</h3>
      <p>
        You may terminate your account at any time by contacting our support
        team. Upon termination, your right to use the service ceases
        immediately.
      </p>

      <h3 class="subsection-title">10.2 Termination by Us</h3>
      <p>
        We may terminate or suspend your account immediately, without notice, if
        we believe you have violated these Terms or applicable laws. Grounds for
        termination include but are not limited to:
      </p>
      <ul>
        <li>Violation of these Terms or applicable laws</li>
        <li>Fraudulent or illegal activity</li>
        <li>Harassment or abuse of other users</li>
        <li>Non-payment of fees or charges</li>
        <li>Repeated violations despite warnings</li>
      </ul>

      <h3 class="subsection-title">10.3 Effect of Termination</h3>
      <p>
        Upon termination, all rights granted to you are immediately revoked. You
        remain liable for any outstanding charges or obligations. Sections that
        by their nature should survive termination shall continue in effect.
      </p>
    </section>

    <!-- Dispute Resolution -->
    <section class="legal-section">
      <h2 class="section-title">11. Dispute Resolution</h2>

      <h3 class="subsection-title">11.1 Governing Law</h3>
      <p>
        These Terms and your use of Matatu Pulse are governed by and construed
        in accordance with the laws of Kenya, without regard to its conflict of
        law principles.
      </p>

      <h3 class="subsection-title">11.2 Jurisdiction</h3>
      <p>
        You agree that any legal action or proceeding arising from these Terms
        shall be brought exclusively in the courts located in Nairobi, Kenya,
        and you consent to the jurisdiction and venue of such courts.
      </p>

      <h3 class="subsection-title">11.3 Dispute Resolution Process</h3>
      <p>
        Before initiating legal proceedings, you agree to attempt to resolve
        disputes through good faith negotiation with our support team. If
        negotiation fails, disputes may be escalated to mediation or arbitration
        as determined by applicable law.
      </p>
    </section>

    <!-- Safety & Liability -->
    <section class="legal-section">
      <h2 class="section-title">12. Safety & Liability Disclaimer</h2>

      <h3 class="subsection-title">12.1 Travel Safety</h3>
      <p>
        While we strive to ensure safe travel experiences, we cannot guarantee
        the safety of any journey. Passengers assume all risks associated with
        travel, including accidents, injuries, or loss of property.
      </p>

      <h3 class="subsection-title">12.2 Driver Conduct</h3>
      <p>
        We are not responsible for the conduct, actions, or negligence of
        drivers, conductors, or SACCO operators. Any claims arising from driver
        conduct should be directed to the relevant SACCO operator or through
        appropriate legal channels.
      </p>

      <h3 class="subsection-title">12.3 Vehicle Condition</h3>
      <p>
        We do not warrant the condition, safety, or roadworthiness of any
        vehicle. SACCO operators are responsible for maintaining their vehicles
        in compliance with applicable regulations.
      </p>
    </section>

    <!-- Data & Privacy -->
    <section class="legal-section">
      <h2 class="section-title">13. Data & Privacy</h2>
      <p>
        Your use of Matatu Pulse is also governed by our Privacy Policy. Please
        review our Privacy Policy to understand our practices regarding the
        collection and use of your personal information.
      </p>
      <p>
        By using Matatu Pulse, you consent to the collection and use of your
        data as described in our Privacy Policy.
      </p>
    </section>

    <!-- Modifications to Service -->
    <section class="legal-section">
      <h2 class="section-title">14. Modifications to Service</h2>
      <p>
        We reserve the right to modify, suspend, or discontinue the Matatu Pulse
        service (or any part thereof) at any time, with or without notice. We
        shall not be liable to you or any third party for any modification,
        suspension, or discontinuation of the service.
      </p>
    </section>

    <!-- Severability -->
    <section class="legal-section">
      <h2 class="section-title">15. Severability</h2>
      <p>
        If any provision of these Terms is found to be invalid, illegal, or
        unenforceable by a court of competent jurisdiction, such provision shall
        be modified to the minimum extent necessary to make it valid and
        enforceable, or if such modification is not possible, the provision
        shall be severed. The remaining provisions shall continue in full force
        and effect.
      </p>
    </section>

    <!-- Entire Agreement -->
    <section class="legal-section">
      <h2 class="section-title">16. Entire Agreement</h2>
      <p>
        These Terms, together with our Privacy Policy and any other policies or
        agreements referenced herein, constitute the entire agreement between
        you and Matatu Pulse regarding your use of the service and supersede all
        prior and contemporaneous agreements, understandings, and negotiations,
        whether written or oral.
      </p>
    </section>

    <!-- Contact & Support -->
    <section class="legal-section">
      <h2 class="section-title">17. Contact & Support</h2>
      <p>
        If you have questions about these Terms or need support, please contact
        us:
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
          <a href="mailto:support@matatupulse.com">support@matatupulse.com</a
          ><br />
          <strong>Legal:</strong>
          <a href="mailto:legal@matatupulse.com">legal@matatupulse.com</a><br />
          <strong>Address:</strong> Matatu Pulse Ltd, Nairobi, Kenya
        </div>
      </div>
    </section>

    <!-- Acknowledgment -->
    <section class="legal-section">
      <div class="acknowledgment-box">
        <h3>Acknowledgment</h3>
        <p>
          By using Matatu Pulse, you acknowledge that you have read these Terms
          and Conditions, understand them, and agree to be bound by them. If you
          do not agree, please do not use our service.
        </p>
      </div>
    </section>

    <div class="legal-footer">
      <p>© {new Date().getFullYear()} Matatu Pulse Ltd. All rights reserved.</p>
      <a href="/privacy" class="legal-link">View Privacy Policy →</a>
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

  /* Prohibited Conduct Grid */
  .prohibited-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }

  .prohibited-card {
    background: rgba(248, 113, 113, 0.05);
    border: 1px solid rgba(248, 113, 113, 0.15);
    border-radius: 10px;
    padding: 16px;
    transition:
      transform 0.2s,
      border-color 0.2s;
  }

  .prohibited-card:hover {
    transform: translateY(-2px);
    border-color: rgba(248, 113, 113, 0.25);
  }

  .prohibited-card h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: #f87171;
    margin-bottom: 6px;
  }

  .prohibited-card p {
    font-size: 0.75rem;
    margin-bottom: 0;
    line-height: 1.5;
    color: var(--text-3);
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

  /* Acknowledgment Box */
  .acknowledgment-box {
    background: linear-gradient(
      135deg,
      rgba(0, 176, 155, 0.08),
      rgba(242, 101, 34, 0.05)
    );
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 12px;
    padding: 24px;
    margin-top: 20px;
  }

  .acknowledgment-box h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 12px;
  }

  .acknowledgment-box p {
    font-size: 0.85rem;
    margin-bottom: 0;
    line-height: 1.6;
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

    .prohibited-grid {
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

    .acknowledgment-box {
      padding: 16px;
    }
  }
</style>
