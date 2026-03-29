<!-- src/routes/(marketing)/cookies/+page.svelte -->
<!--
  Cookie Policy page for Matatu Pulse
  Premium design with cookie consent management
-->
<script lang="ts">
  import { fade } from "svelte/transition"

  let cookieConsent = $state({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false,
  })

  let showConsentForm = $state(false)
  let consentSubmitted = $state(false)

  const lastUpdated = "March 29, 2026"

  // Cookie categories with details
  const cookieCategories = [
    {
      id: "essential",
      name: "Essential Cookies",
      required: true,
      description:
        "These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.",
      cookies: [
        {
          name: "session_id",
          purpose: "Maintains user session",
          duration: "Session",
        },
        {
          name: "csrf_token",
          purpose: "Security token for form submissions",
          duration: "Session",
        },
        {
          name: "auth_token",
          purpose: "User authentication",
          duration: "30 days",
        },
        {
          name: "preferences",
          purpose: "Stores user language and accessibility preferences",
          duration: "1 year",
        },
      ],
    },
    {
      id: "analytics",
      name: "Analytics Cookies",
      required: false,
      description:
        "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
      cookies: [
        {
          name: "_ga",
          purpose: "Google Analytics - User ID",
          duration: "2 years",
        },
        {
          name: "_gid",
          purpose: "Google Analytics - Session ID",
          duration: "24 hours",
        },
        {
          name: "_gat",
          purpose: "Google Analytics - Request throttling",
          duration: "1 minute",
        },
        {
          name: "matatu_analytics",
          purpose: "Custom analytics tracking",
          duration: "90 days",
        },
      ],
    },
    {
      id: "marketing",
      name: "Marketing Cookies",
      required: false,
      description:
        "These cookies are used to track visitors across websites to display relevant advertisements and measure campaign effectiveness.",
      cookies: [
        {
          name: "fbp",
          purpose: "Facebook Pixel tracking",
          duration: "90 days",
        },
        {
          name: "tr",
          purpose: "Facebook conversion tracking",
          duration: "Session",
        },
        {
          name: "utm_source",
          purpose: "Campaign source tracking",
          duration: "Session",
        },
        {
          name: "utm_campaign",
          purpose: "Campaign name tracking",
          duration: "Session",
        },
      ],
    },
    {
      id: "preferences",
      name: "Preference Cookies",
      required: false,
      description:
        "These cookies remember your choices to provide a personalized experience, such as your preferred language or region.",
      cookies: [
        {
          name: "theme_preference",
          purpose: "Stores dark/light mode preference",
          duration: "1 year",
        },
        {
          name: "language",
          purpose: "Stores language preference",
          duration: "1 year",
        },
        {
          name: "region",
          purpose: "Stores region preference",
          duration: "1 year",
        },
        {
          name: "notification_settings",
          purpose: "Stores notification preferences",
          duration: "1 year",
        },
      ],
    },
  ]

  function handleConsentChange(category: string) {
    if (category !== "essential") {
      cookieConsent[category as keyof typeof cookieConsent] =
        !cookieConsent[category as keyof typeof cookieConsent]
    }
  }

  function submitConsent() {
    // Save consent preferences to localStorage
    localStorage.setItem("cookie_consent", JSON.stringify(cookieConsent))
    consentSubmitted = true
    showConsentForm = false

    // Simulate API call
    setTimeout(() => {
      consentSubmitted = false
    }, 3000)
  }

  function acceptAll() {
    cookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    }
    submitConsent()
  }

  function rejectAll() {
    cookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    }
    submitConsent()
  }
</script>

<svelte:head>
  <title>Cookie Policy — Matatu Pulse</title>
  <meta
    name="description"
    content="Learn about how Matatu Pulse uses cookies and manage your cookie preferences."
  />
</svelte:head>

<div class="legal-container">
  <div class="legal-header">
    <div class="eyebrow">Legal & Compliance</div>
    <h1 class="title">Cookie <em>Policy</em></h1>
    <p class="subtitle">
      Last updated: <strong>{lastUpdated}</strong>
    </p>
    <div class="header-line" aria-hidden="true"></div>
  </div>

  <div class="legal-content" in:fade={{ duration: 200 }}>
    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn accept-all" onclick={acceptAll}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Accept All
      </button>
      <button class="action-btn reject-all" onclick={rejectAll}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Reject All
      </button>
      <button
        class="action-btn customize"
        onclick={() => (showConsentForm = !showConsentForm)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
        Customize
      </button>
    </div>

    {#if consentSubmitted}
      <div class="success-banner" in:fade={{ duration: 200 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Your cookie preferences have been saved successfully.
      </div>
    {/if}

    <!-- Introduction -->
    <section class="legal-section">
      <h2 class="section-title">1. What Are Cookies?</h2>
      <p>
        Cookies are small text files that are stored on your device (computer,
        tablet, or mobile phone) when you visit our website. They are widely
        used to make websites work more efficiently, as well as to provide
        information to the owners of the site.
      </p>
      <p>
        Matatu Pulse uses cookies to enhance your experience, understand how you
        use our services, and improve our platform. This Cookie Policy explains
        what cookies we use, why we use them, and how you can control them.
      </p>
    </section>

    <!-- Cookie Categories -->
    <section class="legal-section">
      <h2 class="section-title">2. Cookie Categories</h2>
      <p>We use cookies in the following categories:</p>

      <div class="categories-container">
        {#each cookieCategories as category}
          <div class="category-card">
            <div class="category-header">
              <div class="category-info">
                <h3 class="category-name">{category.name}</h3>
                <p class="category-desc">{category.description}</p>
              </div>
              <div class="category-status">
                {#if category.required}
                  <span class="badge required">Required</span>
                {:else}
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={cookieConsent[
                        category.id as keyof typeof cookieConsent
                      ]}
                      onchange={() => handleConsentChange(category.id)}
                      disabled={category.required}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                {/if}
              </div>
            </div>

            <div class="cookies-list">
              <div class="cookies-header">
                <span class="cookies-label">Cookies Used</span>
                <span class="cookies-count">{category.cookies.length}</span>
              </div>
              {#each category.cookies as cookie}
                <div class="cookie-item">
                  <div class="cookie-name">{cookie.name}</div>
                  <div class="cookie-details">
                    <span class="cookie-purpose">{cookie.purpose}</span>
                    <span class="cookie-duration">{cookie.duration}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Consent Form -->
    {#if showConsentForm}
      <section class="legal-section consent-form" in:fade={{ duration: 200 }}>
        <h2 class="section-title">Manage Your Preferences</h2>

        <div class="consent-options">
          {#each cookieCategories as category}
            <div class="consent-option">
              <div class="option-header">
                <label class="option-label">
                  <input
                    type="checkbox"
                    checked={cookieConsent[
                      category.id as keyof typeof cookieConsent
                    ]}
                    onchange={() => handleConsentChange(category.id)}
                    disabled={category.required}
                  />
                  <span class="option-name">{category.name}</span>
                  {#if category.required}
                    <span class="option-required">(Required)</span>
                  {/if}
                </label>
              </div>
              <p class="option-desc">{category.description}</p>
            </div>
          {/each}
        </div>

        <div class="consent-actions">
          <button
            class="btn btn-secondary"
            onclick={() => (showConsentForm = false)}
          >
            Cancel
          </button>
          <button class="btn btn-primary" onclick={submitConsent}>
            Save Preferences
          </button>
        </div>
      </section>
    {/if}

    <!-- How We Use Cookies -->
    <section class="legal-section">
      <h2 class="section-title">3. How We Use Cookies</h2>

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
          <h4>Security</h4>
          <p>Protect your account and detect fraudulent activity</p>
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
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          </div>
          <h4>Performance</h4>
          <p>Understand how users interact with our platform</p>
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
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </div>
          <h4>Personalization</h4>
          <p>Remember your preferences and settings</p>
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
          <h4>Marketing</h4>
          <p>Deliver relevant content and measure campaign effectiveness</p>
        </div>
      </div>
    </section>

    <!-- Third-Party Cookies -->
    <section class="legal-section">
      <h2 class="section-title">4. Third-Party Cookies</h2>
      <p>
        We work with trusted third-party service providers who may set cookies
        on your device. These include:
      </p>

      <div class="third-party-list">
        <div class="third-party-item">
          <h4>Google Analytics</h4>
          <p>
            Helps us understand website traffic and user behavior. <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener">Privacy Policy</a
            >
          </p>
        </div>

        <div class="third-party-item">
          <h4>Facebook Pixel</h4>
          <p>
            Tracks conversions and helps us deliver targeted advertisements. <a
              href="https://www.facebook.com/policies/cookies/"
              target="_blank"
              rel="noopener">Cookie Policy</a
            >
          </p>
        </div>

        <div class="third-party-item">
          <h4>Stripe</h4>
          <p>
            Processes payments securely. <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener">Privacy Policy</a
            >
          </p>
        </div>

        <div class="third-party-item">
          <h4>Sentry</h4>
          <p>
            Monitors application performance and errors. <a
              href="https://sentry.io/privacy/"
              target="_blank"
              rel="noopener">Privacy Policy</a
            >
          </p>
        </div>
      </div>
    </section>

    <!-- Cookie Control -->
    <section class="legal-section">
      <h2 class="section-title">5. How to Control Cookies</h2>

      <h3 class="subsection-title">5.1 Browser Settings</h3>
      <p>
        Most web browsers allow you to control cookies through their settings.
        You can typically find these settings in the "Options," "Preferences,"
        or "Settings" menu of your browser. Here's how to manage cookies in
        popular browsers:
      </p>
      <ul>
        <li>
          <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other
          site data
        </li>
        <li>
          <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and
          Site Data
        </li>
        <li>
          <strong>Safari:</strong> Preferences → Privacy → Cookies and website data
        </li>
        <li>
          <strong>Edge:</strong> Settings → Privacy, search, and services → Clear
          browsing data
        </li>
      </ul>

      <h3 class="subsection-title">5.2 Opt-Out Tools</h3>
      <p>
        You can opt out of certain cookies using industry-standard opt-out
        tools:
      </p>
      <ul>
        <li>
          <a href="https://optout.aboutads.info/" target="_blank" rel="noopener"
            >Digital Advertising Alliance (DAA) Opt-Out</a
          >
        </li>
        <li>
          <a
            href="https://www.networkadvertising.org/managing/opt_out.asp"
            target="_blank"
            rel="noopener">Network Advertising Initiative (NAI) Opt-Out</a
          >
        </li>
        <li>
          <a
            href="https://www.youronlinechoices.eu/"
            target="_blank"
            rel="noopener">Your Online Choices (EU)</a
          >
        </li>
      </ul>

      <h3 class="subsection-title">5.3 Do Not Track</h3>
      <p>
        Some browsers include a "Do Not Track" feature. When enabled, this sends
        a signal to websites requesting they do not track your activity.
        However, not all websites honor this signal.
      </p>
    </section>

    <!-- Cookie Retention -->
    <section class="legal-section">
      <h2 class="section-title">6. Cookie Retention</h2>
      <p>We retain cookies for different periods depending on their purpose:</p>
      <ul>
        <li>
          <strong>Session Cookies:</strong> Deleted when you close your browser
        </li>
        <li>
          <strong>Persistent Cookies:</strong> Retained for the duration specified
          in the cookie details (typically 1 month to 2 years)
        </li>
        <li>
          <strong>Analytics Cookies:</strong> Typically retained for 90 days to 2
          years
        </li>
      </ul>
      <p>
        You can delete cookies at any time through your browser settings or by
        using our cookie management tool above.
      </p>
    </section>

    <!-- GDPR & Privacy -->
    <section class="legal-section">
      <h2 class="section-title">7. GDPR & Privacy Compliance</h2>
      <p>
        We comply with the General Data Protection Regulation (GDPR) and other
        privacy laws. We only set non-essential cookies with your explicit
        consent. You can withdraw your consent at any time by updating your
        preferences above.
      </p>
      <p>
        For more information about how we handle your personal data, please
        review our <a href="/privacy">Privacy Policy</a>.
      </p>
    </section>

    <!-- Changes to Policy -->
    <section class="legal-section">
      <h2 class="section-title">8. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time to reflect changes in
        our practices or for other operational, legal, or regulatory reasons. We
        will notify you of any material changes by updating the "Last updated"
        date at the top of this page.
      </p>
    </section>

    <!-- Contact -->
    <section class="legal-section">
      <h2 class="section-title">9. Contact Us</h2>
      <p>
        If you have questions about our use of cookies or this Cookie Policy,
        please contact us:
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
      <div class="footer-links">
        <a href="/privacy" class="legal-link">Privacy Policy →</a>
        <a href="/terms" class="legal-link">Terms & Conditions →</a>
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

  /* Quick Actions */
  .quick-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-2);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .action-btn.accept-all {
    background: rgba(0, 176, 155, 0.1);
    border-color: rgba(0, 176, 155, 0.2);
    color: var(--teal);
  }

  .action-btn.accept-all:hover {
    background: rgba(0, 176, 155, 0.15);
    border-color: rgba(0, 176, 155, 0.3);
  }

  .action-btn.reject-all {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .action-btn.reject-all:hover {
    background: rgba(248, 113, 113, 0.15);
    border-color: rgba(248, 113, 113, 0.3);
  }

  /* Success Banner */
  .success-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 10px;
    color: #10b981;
    font-size: 0.85rem;
    margin-bottom: 24px;
  }

  /* Legal Section */
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

  a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  a:hover {
    text-decoration: underline;
  }

  /* Categories Container */
  .categories-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 20px 0;
  }

  .category-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }

  .category-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .category-info {
    flex: 1;
  }

  .category-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .category-desc {
    font-size: 0.8rem;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 0;
  }

  .category-status {
    display: flex;
    align-items: center;
  }

  .badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--teal);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Toggle Switch */
  .toggle-switch {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    position: relative;
    width: 44px;
    height: 24px;
  }

  .toggle-switch input {
    display: none;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .toggle-slider::after {
    content: "";
    position: absolute;
    width: 20px;
    height: 20px;
    left: 2px;
    top: 2px;
    background: white;
    border-radius: 10px;
    transition: all 0.3s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background: var(--teal);
    border-color: var(--teal);
  }

  .toggle-switch input:checked + .toggle-slider::after {
    left: 22px;
  }

  .toggle-switch input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Cookies List */
  .cookies-list {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 16px;
  }

  .cookies-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .cookies-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }

  .cookies-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 100px;
  }

  .cookie-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .cookie-item:last-child {
    border-bottom: none;
  }

  .cookie-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-1);
    font-family: monospace;
  }

  .cookie-details {
    display: flex;
    gap: 16px;
    font-size: 0.7rem;
    color: var(--text-3);
  }

  .cookie-purpose {
    color: var(--text-3);
  }

  .cookie-duration {
    background: rgba(255, 255, 255, 0.03);
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--text-2);
  }

  /* Consent Form */
  .consent-form {
    background: rgba(0, 176, 155, 0.05);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 12px;
    padding: 24px;
  }

  .consent-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 20px 0;
  }

  .consent-option {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 16px;
  }

  .option-header {
    margin-bottom: 8px;
  }

  .option-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-weight: 600;
    color: var(--text-1);
  }

  .option-label input {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--teal);
  }

  .option-label input:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .option-name {
    font-size: 0.9rem;
  }

  .option-required {
    font-size: 0.75rem;
    color: var(--text-3);
    font-weight: 500;
  }

  .option-desc {
    font-size: 0.8rem;
    color: var(--text-3);
    margin-bottom: 0;
  }

  .consent-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-2);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .btn-primary {
    background: var(--teal);
    color: #13131e;
    border-color: var(--teal);
    font-weight: 700;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }

  /* Usage Grid */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }

  .usage-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 20px;
    transition: transform 0.2s;
  }

  .usage-card:hover {
    transform: translateY(-2px);
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
  }

  /* Third Party List */
  .third-party-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }

  .third-party-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 16px;
  }

  .third-party-item h4 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .third-party-item p {
    font-size: 0.8rem;
    margin-bottom: 0;
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

    .quick-actions {
      flex-direction: column;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }

    .category-header {
      flex-direction: column;
    }

    .usage-grid {
      grid-template-columns: 1fr;
    }

    .third-party-list {
      grid-template-columns: 1fr;
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

    .consent-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .legal-content {
      padding: 20px 16px;
    }

    .section-title {
      font-size: 1.1rem;
    }

    .cookie-details {
      flex-direction: column;
      gap: 8px;
    }
  }
</style>
