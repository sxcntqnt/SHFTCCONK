<script lang="ts">
  const lastUpdated = "March 29, 2026"
</script>

<svelte:head>
  <title>Legal Structure — Sxcntcnqunts</title>
  <meta
    name="description"
    content="Learn about the legal structure and corporate organization of Sxcntcnqunts."
  />
</svelte:head>

<div class="legal-container">
  <div class="legal-header">
    <div class="eyebrow">Legal & Compliance</div>
    <h1 class="title">Legal <em>Structure</em></h1>
    <p class="subtitle">
      Last updated: <strong>{lastUpdated}</strong>
    </p>
    <div class="header-line"></div>
  </div>

  <div class="legal-content">
    <!-- 1. Overview -->
    <section class="legal-section">
      <h2 class="section-title">1. Overview</h2>
      <p>
        Sxcntcnqunts operates through a structured international corporate
        framework designed to support its technology platform, data
        infrastructure, and cross-border operations.
      </p>
      <p>
        This structure enables the group to maintain high standards of
        governance, security, and regulatory compliance while serving users
        across multiple jurisdictions.
      </p>
    </section>

    <!-- 2. Corporate Structure -->
    <section class="legal-section">
      <h2 class="section-title">2. Corporate Structure</h2>

      <p>
        <strong>Sxcntcnqunts Holdings Ltd</strong>, a company incorporated in
        Dubai, United Arab Emirates, is the holding company of the Sxcntcnqunts
        group.
      </p>

      <ul>
        <li>Platform architecture and technology infrastructure</li>
        <li>Strategic direction and global operations</li>
        <li>Intellectual property ownership and development</li>
      </ul>

      <p>
        <strong>Sxcntcnqunts Kenya Ltd</strong>, a company registered in Kenya,
        operates as the group’s local entity and is responsible for:
      </p>

      <ul>
        <li>User onboarding and platform access</li>
        <li>Data collection and processing activities</li>
        <li>Compliance with applicable local laws and regulations</li>
      </ul>

      <p>
        Sxcntcnqunts Kenya Ltd is a wholly owned subsidiary of Sxcntcnqunts
        Holdings Ltd.
      </p>
    </section>

    <!-- 3. Data Governance -->
    <section class="legal-section">
      <h2 class="section-title">3. Data Governance & Regulatory Compliance</h2>

      <p>
        Sxcntcnqunts is committed to maintaining strong data governance
        practices across all its operations.
      </p>

      <p>
        Sxcntcnqunts Kenya Ltd processes personal data in accordance with
        applicable Kenyan data protection laws and the requirements of the
        <a href="https://www.odpc.go.ke/" target="_blank" rel="noopener">
          Office of the Data Protection Commissioner Kenya
        </a>.
      </p>

      <p>
        Where personal data is transferred across jurisdictions within the
        group, appropriate safeguards are implemented to ensure such transfers
        comply with applicable legal and regulatory standards.
      </p>

      <ul>
        <li>Contractual data protection obligations</li>
        <li>Internal data governance policies</li>
        <li>Secure data handling and storage protocols</li>
      </ul>
    </section>

    <!-- 4. Cross-Border -->
    <section class="legal-section">
      <h2 class="section-title">4. Cross-Border Operations</h2>

      <p>
        As a technology platform operating across multiple jurisdictions,
        Sxcntcnqunts may process and store data in different locations depending
        on operational and technical requirements.
      </p>

      <p>All cross-border activities are structured to ensure:</p>

      <ul>
        <li>Compliance with applicable data protection laws</li>
        <li>Protection of user rights and personal data</li>
        <li>
          Alignment with internationally recognized data protection principles
        </li>
      </ul>
    </section>

    <!-- 5. Disclosure -->
    <section class="legal-section">
      <h2 class="section-title">5. Limitation of Public Disclosure</h2>

      <p>
        Sxcntcnqunts maintains a structured corporate framework that may include
        additional internal governance or ownership arrangements not disclosed
        on this page.
      </p>

      <p>
        Such arrangements are maintained in accordance with applicable laws and
        are disclosed where required to regulators, financial institutions, and
        competent authorities.
      </p>
    </section>

    <!-- 6. Contact -->
    <section class="legal-section">
      <h2 class="section-title">6. Contact & Legal Inquiries</h2>

      <p>For legal, corporate, or regulatory inquiries, please contact:</p>

      <div class="contact-box">
        <div>
          <span class="label">Legal Team:</span>
          <a href="mailto:legal@sxcntcnqunts.com">legal@sxcntcnqunts.com</a>
        </div>
        <div>
          <span class="label">Data Protection Officer:</span>
          <a href="mailto:dpo@sxcntcnqunts.com">dpo@sxcntcnqunts.com</a>
        </div>
      </div>
    </section>

    <!-- 7. Updates -->
    <section class="legal-section">
      <h2 class="section-title">7. Updates to This Page</h2>

      <p>
        Sxcntcnqunts may update this page from time to time to reflect changes
        in its corporate structure, operations, or regulatory obligations.
      </p>

      <p>
        Users are encouraged to review this page periodically for the latest
        information.
      </p>
    </section>

    <div class="legal-footer">
      <p>© {new Date().getFullYear()} Sxcntcnqunts. All rights reserved.</p>
    </div>
  </div>
</div>

<style>
  .legal-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .legal-header {
    margin-bottom: 40px;
  }

  .eyebrow {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
  }

  .title {
    font-size: clamp(2rem, 4vw, 2.6rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-1);
  }

  .title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 0.85rem;
    color: var(--text-3);
    margin-top: 6px;
  }

  .header-line {
    margin-top: 16px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.4),
      transparent
    );
  }

  .legal-content {
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 40px;
  }

  .legal-section {
    margin-bottom: 36px;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 6px;
  }

  p {
    font-size: 0.85rem;
    line-height: 1.7;
    color: var(--text-3);
  }

  ul {
    margin: 10px 0 16px 20px;
  }

  li {
    font-size: 0.82rem;
    margin-bottom: 6px;
  }

  li::marker {
    color: var(--orange);
  }

  .contact-box {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-weight: 600;
    margin-right: 6px;
  }

  a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  a:hover {
    text-decoration: underline;
  }

  .legal-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-3);
  }

  @media (max-width: 768px) {
    .legal-content {
      padding: 24px;
    }
  }
</style>
