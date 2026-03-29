<!-- src/lib/components/LegalFooter.svelte -->
<!--
  Legal Footer Component
  Premium design matching Matatu Pulse branding
  Includes all legal links and company information
-->
<script lang="ts">
  import { fade } from "svelte/transition"

  // Current year for copyright
  const currentYear = new Date().getFullYear()

  // Legal pages links
  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR Compliance", href: "/legal/gdpr" },
    { label: "Legal Structure", href: "/legal/structure" },
  ]

  // Company information for public disclosure
  const companyInfo = {
    holding: "Sxcntcnqunts Holdings Ltd",
    holdingLocation: "Dubai, UAE",
    operating: "Sxcntcnqunts Kenya Ltd",
    operatingLocation: "Nairobi, Kenya",
    email: "legal@matatupulse.com",
    phone: "+254 700 123 456",
  }
</script>

<footer class="legal-footer" in:fade={{ duration: 200 }}>
  <div class="footer-container">
    <!-- Company Information -->
    <div class="company-section">
      <div class="company-logo">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
        <span class="logo-text">Matatu Pulse</span>
      </div>

      <div class="company-structure">
        <div class="structure-item">
          <div class="structure-label">Holding Company</div>
          <div class="structure-value">{companyInfo.holding}</div>
          <div class="structure-location">{companyInfo.holdingLocation}</div>
        </div>

        <div class="structure-item">
          <div class="structure-label">Operating Entity</div>
          <div class="structure-value">{companyInfo.operating}</div>
          <div class="structure-location">{companyInfo.operatingLocation}</div>
        </div>
      </div>
    </div>

    <!-- Legal Links -->
    <div class="links-section">
      <h3 class="links-title">Legal & Compliance</h3>
      <div class="links-grid">
        {#each legalLinks as link}
          <a href={link.href} class="legal-link">
            {link.label}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        {/each}
      </div>
    </div>

    <!-- Contact Information -->
    <div class="contact-section">
      <h3 class="contact-title">Legal Inquiries</h3>
      <div class="contact-info">
        <a href={`mailto:${companyInfo.email}`} class="contact-link">
          <svg
            width="14"
            height="14"
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
          {companyInfo.email}
        </a>

        <a
          href={`tel:${companyInfo.phone.replace(/\s/g, "")}`}
          class="contact-link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
            />
          </svg>
          {companyInfo.phone}
        </a>
      </div>
    </div>

    <!-- Copyright & Compliance -->
    <div class="compliance-section">
      <div class="copyright">
        © {currentYear}
        {companyInfo.holding}. All rights reserved.
      </div>

      <div class="compliance-badges">
        <div class="compliance-badge">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Data Protected
        </div>

        <div class="compliance-badge">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          GDPR Compliant
        </div>

        <div class="compliance-badge">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          Licensed PSP
        </div>
      </div>
    </div>
  </div>
</footer>

<style>
  .legal-footer {
    background: #0a0a0f;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 40px 0 20px 0;
    margin-top: 60px;
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 40px;
  }

  /* Company Section */
  .company-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .company-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--orange);
    font-weight: 700;
    font-size: 1.1rem;
  }

  .logo-text {
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .company-structure {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .structure-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px;
  }

  .structure-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .structure-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .structure-location {
    font-size: 0.75rem;
    color: var(--text-3);
  }

  /* Links Section */
  .links-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .links-title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-2);
    margin-bottom: 4px;
  }

  .links-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .legal-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-3);
    text-decoration: none;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .legal-link:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    color: var(--text-1);
    transform: translateX(2px);
  }

  .legal-link svg {
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .legal-link:hover svg {
    opacity: 1;
  }

  /* Contact Section */
  .contact-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .contact-title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-2);
    margin-bottom: 4px;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .contact-link {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    color: var(--text-3);
    text-decoration: none;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .contact-link:hover {
    background: rgba(242, 101, 34, 0.08);
    border-color: rgba(242, 101, 34, 0.2);
    color: var(--orange);
  }

  .contact-link svg {
    opacity: 0.7;
  }

  /* Compliance Section */
  .compliance-section {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .copyright {
    font-size: 0.75rem;
    color: var(--text-3);
  }

  .compliance-badges {
    display: flex;
    gap: 12px;
  }

  .compliance-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 10px;
    border-radius: 100px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .footer-container {
      grid-template-columns: 1fr;
      gap: 30px;
    }

    .compliance-section {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }

    .compliance-badges {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .legal-footer {
      padding: 30px 0 20px 0;
    }

    .footer-container {
      padding: 0 16px;
    }

    .company-structure {
      gap: 12px;
    }

    .structure-item {
      padding: 10px;
    }
  }
</style>
