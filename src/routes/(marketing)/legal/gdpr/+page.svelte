<!-- src/routes/(marketing)/legal/gdpr/+page.svelte -->
<!--
  GDPR Compliance page for Matatu Pulse
  Premium design with data subject request forms
-->
<script lang="ts">
  import { fade } from "svelte/transition"

  let requestType = $state("access")
  let formData = $state({
    name: "",
    email: "",
    phone: "",
    requestType: "access",
    description: "",
    attachments: "",
  })

  let formSubmitted = $state(false)
  let formError = $state("")

  const lastUpdated = "March 29, 2026"

  // GDPR Rights
  const gdprRights = [
    {
      title: "Right to Access",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      description:
        "You have the right to access your personal data and receive a copy of it.",
      details: [
        "Request a copy of all your personal data",
        "Understand how your data is being used",
        "Receive data in a structured, commonly used format",
        "Request within 30 days",
      ],
    },
    {
      title: "Right to Rectification",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      description:
        "You can request correction of inaccurate or incomplete personal data.",
      details: [
        "Correct inaccurate information",
        "Complete incomplete data",
        "Update outdated information",
        "No cost for corrections",
      ],
    },
    {
      title: "Right to Erasure",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      description:
        "You can request deletion of your personal data under certain conditions.",
      details: [
        "Request deletion of your data",
        "Data no longer necessary for original purpose",
        "Withdrawal of consent",
        "Applicable where legal basis no longer exists",
      ],
    },
    {
      title: "Right to Data Portability",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
      description:
        "You can receive your data in a portable format and transfer it elsewhere.",
      details: [
        "Receive data in machine-readable format",
        "Transfer data to another service provider",
        "Data portability for commonly used formats",
        "No cost for data portability",
      ],
    },
    {
      title: "Right to Object",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      description:
        "You can object to processing of your personal data in certain circumstances.",
      details: [
        "Object to marketing communications",
        "Object to profiling and automated decisions",
        "Object to processing for legitimate interests",
        "Right to opt-out of analytics",
      ],
    },
    {
      title: "Right to Restrict Processing",
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
      description: "You can request limitation of how your data is processed.",
      details: [
        "Restrict processing while accuracy is verified",
        "Restrict processing if unlawful",
        "Restrict processing if no longer needed",
        "Data retained but not actively processed",
      ],
    },
  ]

  // Data Processing Information
  const dataProcessing = [
    {
      category: "Legal Basis",
      items: [
        "Consent - You have explicitly consented to processing",
        "Contract - Processing necessary to fulfill our service agreement",
        "Legal Obligation - Required by law (KYC, AML compliance)",
        "Legitimate Interests - Necessary for our business operations",
        "Public Task - Processing necessary for public interest",
      ],
    },
    {
      category: "Data Retention",
      items: [
        "Account Data - Retained while active, 3 years after deletion",
        "Transaction Data - 7 years for tax and legal compliance",
        "Location Data - 30 days for operational purposes",
        "Communication Data - 1 year for customer service",
        "Marketing Data - Until consent withdrawn",
      ],
    },
    {
      category: "Data Transfers",
      items: [
        "EU/EEA - Standard Contractual Clauses (SCCs)",
        "Third Countries - Adequacy decisions where applicable",
        "Service Providers - Data Processing Agreements in place",
        "Subprocessors - Listed on our website with notification",
        "International Transfers - GDPR compliant mechanisms",
      ],
    },
  ]

  function handleSubmit(e: Event) {
    e.preventDefault()
    formError = ""

    // Validation
    if (!formData.name.trim()) {
      formError = "Please enter your name"
      return
    }
    if (!formData.email.trim()) {
      formError = "Please enter your email address"
      return
    }
    if (!formData.description.trim()) {
      formError = "Please describe your request"
      return
    }

    // Simulate form submission
    console.log("Form submitted:", formData)
    formSubmitted = true

    // Reset form after 3 seconds
    setTimeout(() => {
      formSubmitted = false
      formData = {
        name: "",
        email: "",
        phone: "",
        requestType: "access",
        description: "",
        attachments: "",
      }
    }, 3000)
  }
</script>

<svelte:head>
  <title>GDPR Compliance — Matatu Pulse</title>
  <meta
    name="description"
    content="Learn about your GDPR rights and how to exercise them with Matatu Pulse."
  />
</svelte:head>

<div class="legal-container">
  <div class="legal-header">
    <div class="eyebrow">Legal & Compliance</div>
    <h1 class="title">GDPR <em>Compliance</em></h1>
    <p class="subtitle">
      Last updated: <strong>{lastUpdated}</strong>
    </p>
    <div class="header-line" aria-hidden="true"></div>
  </div>

  <div class="legal-content" in:fade={{ duration: 200 }}>
    <!-- Introduction -->
    <section class="legal-section">
      <h2 class="section-title">1. GDPR Overview</h2>
      <p>
        The General Data Protection Regulation (GDPR) is a comprehensive data
        protection law that applies to organizations processing personal data of
        EU/EEA residents. Matatu Pulse is committed to full GDPR compliance and
        respects your data protection rights.
      </p>
      <p>
        This page explains your rights under GDPR and how you can exercise them.
        If you have any questions, please contact our Data Protection Officer at <a
          href="mailto:dpo@matatupulse.com">dpo@matatupulse.com</a
        >.
      </p>
    </section>

    <!-- Your GDPR Rights -->
    <section class="legal-section">
      <h2 class="section-title">2. Your GDPR Rights</h2>
      <p>
        Under GDPR, you have the following rights regarding your personal data:
      </p>

      <div class="rights-grid">
        {#each gdprRights as right}
          <div class="right-card">
            <div class="right-icon" style="color: var(--teal)">
              {@html right.icon}
            </div>
            <h3 class="right-title">{right.title}</h3>
            <p class="right-desc">{right.description}</p>
            <ul class="right-details">
              {#each right.details as detail}
                <li>{detail}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>

    <!-- Data Processing Information -->
    <section class="legal-section">
      <h2 class="section-title">3. Data Processing Information</h2>

      <div class="processing-grid">
        {#each dataProcessing as section}
          <div class="processing-card">
            <h3 class="processing-title">{section.category}</h3>
            <ul class="processing-list">
              {#each section.items as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>

    <!-- Data Subject Rights Request Form -->
    <section class="legal-section">
      <h2 class="section-title">4. Submit a Data Subject Request</h2>
      <p>
        Use the form below to exercise your GDPR rights. We will respond to your
        request within 30 days. For complex requests, we may extend this period
        by up to 60 days.
      </p>

      {#if formSubmitted}
        <div class="success-message" in:fade={{ duration: 200 }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <strong>Request Submitted Successfully</strong>
            <p>
              We have received your data subject request. Our Data Protection
              Officer will review it and respond within 30 days.
            </p>
          </div>
        </div>
      {/if}

      {#if formError}
        <div class="error-message" in:fade={{ duration: 200 }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {formError}
        </div>
      {/if}

      <form class="request-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="name" class="form-label">Full Name *</label>
          <input
            type="text"
            id="name"
            class="form-input"
            placeholder="Your full name"
            bind:value={formData.name}
            required
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="email" class="form-label">Email Address *</label>
            <input
              type="email"
              id="email"
              class="form-input"
              placeholder="your@email.com"
              bind:value={formData.email}
              required
            />
          </div>

          <div class="form-group">
            <label for="phone" class="form-label">Phone Number</label>
            <input
              type="tel"
              id="phone"
              class="form-input"
              placeholder="+254 700 123 456"
              bind:value={formData.phone}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="requestType" class="form-label">Request Type *</label>
          <select
            id="requestType"
            class="form-select"
            bind:value={formData.requestType}
          >
            <option value="access">Right to Access (SAR)</option>
            <option value="rectification">Right to Rectification</option>
            <option value="erasure"
              >Right to Erasure (Right to be Forgotten)</option
            >
            <option value="portability">Right to Data Portability</option>
            <option value="object">Right to Object</option>
            <option value="restrict">Right to Restrict Processing</option>
            <option value="complaint">File a Complaint</option>
            <option value="other">Other Request</option>
          </select>
        </div>

        <div class="form-group">
          <label for="description" class="form-label"
            >Request Description *</label
          >
          <textarea
            id="description"
            class="form-textarea"
            placeholder="Please describe your request in detail..."
            rows="6"
            bind:value={formData.description}
            required
          ></textarea>
          <div class="char-count">{formData.description.length} / 2000</div>
        </div>

        <div class="form-group">
          <label for="attachments" class="form-label"
            >Supporting Documents (Optional)</label
          >
          <div class="file-upload">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div class="file-text">
              <p class="file-label">Upload supporting documents</p>
              <p class="file-hint">PDF, DOC, DOCX (Max 10MB)</p>
            </div>
            <input
              type="file"
              id="attachments"
              class="file-input"
              accept=".pdf,.doc,.docx"
              bind:value={formData.attachments}
            />
          </div>
        </div>

        <div class="form-notice">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>
            We will verify your identity before processing your request. You may
            be asked to provide additional information to confirm your identity.
          </p>
        </div>

        <button type="submit" class="submit-btn">
          Submit Data Subject Request
        </button>
      </form>
    </section>

    <!-- Data Protection Officer -->
    <section class="legal-section">
      <h2 class="section-title">5. Data Protection Officer</h2>
      <p>
        Matatu Pulse has appointed a Data Protection Officer (DPO) to oversee
        our GDPR compliance and handle data subject requests.
      </p>

      <div class="dpo-card">
        <div class="dpo-header">
          <h3>Data Protection Officer</h3>
          <span class="dpo-badge">GDPR Appointed</span>
        </div>

        <div class="dpo-info">
          <div class="dpo-item">
            <span class="dpo-label">Email:</span>
            <a href="mailto:dpo@matatupulse.com">dpo@matatupulse.com</a>
          </div>

          <div class="dpo-item">
            <span class="dpo-label">Phone:</span>
            <a href="tel:+254700123456">+254 700 123 456</a>
          </div>

          <div class="dpo-item">
            <span class="dpo-label">Address:</span>
            <span
              >Data Protection Officer, Matatu Pulse Ltd, Nairobi, Kenya</span
            >
          </div>

          <div class="dpo-item">
            <span class="dpo-label">Response Time:</span>
            <span
              >Within 30 days (extendable to 60 days for complex requests)</span
            >
          </div>
        </div>
      </div>
    </section>

    <!-- Supervisory Authority -->
    <section class="legal-section">
      <h2 class="section-title">6. Supervisory Authority</h2>
      <p>
        If you believe your GDPR rights have been violated, you have the right
        to lodge a complaint with your local data protection authority:
      </p>

      <div class="authorities-grid">
        <div class="authority-card">
          <h4>EU/EEA Residents</h4>
          <p>
            Contact your national data protection authority. Find your authority
            at:
          </p>
          <a
            href="https://edpb.ec.europa.eu/about-edpb/members_en"
            target="_blank"
            rel="noopener"
          >
            European Data Protection Board →
          </a>
        </div>

        <div class="authority-card">
          <h4>Kenya Residents</h4>
          <p>Contact the Office of the Data Protection Commissioner:</p>
          <a href="https://www.odpc.go.ke/" target="_blank" rel="noopener">
            ODPC Kenya →
          </a>
        </div>

        <div class="authority-card">
          <h4>UAE Residents</h4>
          <p>Contact the UAE Data Protection Authority:</p>
          <a href="https://www.tdra.gov.ae/" target="_blank" rel="noopener">
            TDRA UAE →
          </a>
        </div>
      </div>
    </section>

    <!-- Data Processing Agreements -->
    <section class="legal-section">
      <h2 class="section-title">7. Data Processing Agreements</h2>
      <p>
        For business customers and organizations, we provide Data Processing
        Agreements (DPA) that comply with GDPR Article 28. These agreements
        outline:
      </p>

      <ul>
        <li>Scope and nature of data processing</li>
        <li>Purpose and duration of processing</li>
        <li>Type of personal data and categories of data subjects</li>
        <li>Obligations and rights of the data controller</li>
        <li>Sub-processor arrangements</li>
        <li>Data subject rights and assistance</li>
        <li>Security measures and data protection</li>
        <li>Audit and compliance procedures</li>
      </ul>

      <p>
        To request a DPA or discuss data processing arrangements, please contact
        our legal team at <a href="mailto:legal@matatupulse.com"
          >legal@matatupulse.com</a
        >.
      </p>
    </section>

    <!-- Security Measures -->
    <section class="legal-section">
      <h2 class="section-title">8. Security Measures</h2>
      <p>
        We implement comprehensive security measures to protect your personal
        data:
      </p>

      <div class="security-grid">
        <div class="security-item">
          <div class="security-icon">
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
          <h4>Encryption</h4>
          <p>End-to-end encryption for data in transit and at rest</p>
        </div>

        <div class="security-item">
          <div class="security-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h4>Access Control</h4>
          <p>Role-based access control and authentication</p>
        </div>

        <div class="security-item">
          <div class="security-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <h4>Monitoring</h4>
          <p>Continuous security monitoring and threat detection</p>
        </div>

        <div class="security-item">
          <div class="security-icon">
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
          <h4>Audits</h4>
          <p>Regular security audits and compliance assessments</p>
        </div>
      </div>
    </section>

    <!-- Contact & Support -->
    <section class="legal-section">
      <h2 class="section-title">9. Contact & Support</h2>
      <p>
        For GDPR-related inquiries, data subject requests, or privacy concerns:
      </p>

      <div class="contact-options">
        <div class="contact-option">
          <h4>Data Protection Officer</h4>
          <a href="mailto:dpo@matatupulse.com">dpo@matatupulse.com</a>
        </div>

        <div class="contact-option">
          <h4>Legal Team</h4>
          <a href="mailto:legal@matatupulse.com">legal@matatupulse.com</a>
        </div>

        <div class="contact-option">
          <h4>Privacy Team</h4>
          <a href="mailto:privacy@matatupulse.com">privacy@matatupulse.com</a>
        </div>
      </div>
    </section>

    <div class="legal-footer">
      <p>© {new Date().getFullYear()} Matatu Pulse Ltd. All rights reserved.</p>
      <div class="footer-links">
        <a href="/privacy" class="legal-link">Privacy Policy →</a>
        <a href="/cookies" class="legal-link">Cookie Policy →</a>
      </div>
    </div>
  </div>
</div>

<style>
  .legal-container {
    width: 100%;
    max-width: 900px;
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

  p {
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--text-3);
    margin-bottom: 16px;
  }

  p a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  p a:hover {
    text-decoration: underline;
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

  /* Rights Grid */
  .rights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .right-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }

  .right-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
  }

  .right-icon {
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

  .right-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .right-desc {
    font-size: 0.8rem;
    color: var(--text-3);
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .right-details {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .right-details li {
    font-size: 0.75rem;
    margin-bottom: 6px;
    margin-left: 0;
  }

  .right-details li::before {
    content: "✓";
    color: var(--teal);
    margin-right: 6px;
  }

  /* Processing Grid */
  .processing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .processing-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
  }

  .processing-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 12px;
  }

  .processing-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .processing-list li {
    font-size: 0.8rem;
    margin-bottom: 8px;
    margin-left: 0;
    padding-left: 16px;
    position: relative;
  }

  .processing-list li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--orange);
    font-weight: bold;
  }

  /* Form Styles */
  .success-message,
  .error-message {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .success-message {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #10b981;
  }

  .success-message strong {
    display: block;
    margin-bottom: 4px;
  }

  .error-message {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .request-form {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 24px;
    margin-top: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--text-1);
    font-size: 0.85rem;
    font-family: inherit;
    transition: all 0.2s;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--teal);
    box-shadow: 0 0 0 3px rgba(0, 176, 155, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 120px;
  }

  .char-count {
    font-size: 0.7rem;
    color: var(--text-3);
    margin-top: 4px;
    text-align: right;
  }

  .file-upload {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .file-upload:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .file-upload svg {
    color: var(--orange);
    flex-shrink: 0;
  }

  .file-text {
    flex: 1;
  }

  .file-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .file-hint {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-bottom: 0;
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .form-notice {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(0, 176, 155, 0.05);
    border-left: 3px solid var(--teal);
    border-radius: 0 8px 8px 0;
    font-size: 0.8rem;
    color: var(--text-3);
  }

  .form-notice svg {
    color: var(--teal);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .submit-btn {
    width: 100%;
    padding: 12px 20px;
    background: var(--teal);
    color: #13131e;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* DPO Card */
  .dpo-card {
    background: rgba(0, 176, 155, 0.05);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 12px;
    padding: 24px;
    margin-top: 16px;
  }

  .dpo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(0, 176, 155, 0.1);
  }

  .dpo-header h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin: 0;
  }

  .dpo-badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--teal);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dpo-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dpo-item {
    display: flex;
    gap: 12px;
  }

  .dpo-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-2);
    min-width: 100px;
  }

  .dpo-item a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  .dpo-item a:hover {
    text-decoration: underline;
  }

  .dpo-item span {
    font-size: 0.85rem;
    color: var(--text-3);
  }

  /* Authorities Grid */
  .authorities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .authority-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
  }

  .authority-card h4 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .authority-card p {
    font-size: 0.8rem;
    margin-bottom: 12px;
  }

  .authority-card a {
    display: inline-block;
    font-size: 0.8rem;
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  .authority-card a:hover {
    text-decoration: underline;
  }

  /* Security Grid */
  .security-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .security-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .security-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    margin: 0 auto 12px;
  }

  .security-item h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .security-item p {
    font-size: 0.75rem;
    margin-bottom: 0;
  }

  /* Contact Options */
  .contact-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .contact-option {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px;
  }

  .contact-option h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .contact-option a {
    display: block;
    font-size: 0.85rem;
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  .contact-option a:hover {
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

  .footer-links {
    display: flex;
    gap: 20px;
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

    .rights-grid,
    .processing-grid,
    .authorities-grid,
    .security-grid,
    .contact-options {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .dpo-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .legal-footer {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }

    .footer-links {
      flex-direction: column;
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

    .dpo-item {
      flex-direction: column;
      gap: 4px;
    }
  }
</style>
