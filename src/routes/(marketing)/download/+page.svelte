<svelte:head>
  <title>Download Matatu Pulse — Get the App</title>
  <meta
    name="description"
    content="Download Matatu Pulse and track matatus in real time across Nairobi. Get live arrival alerts, route intelligence, and more."
  />
  <meta property="og:title" content="Download — Matatu Pulse" />
  <meta
    property="og:description"
    content="Get the app and start tracking matatus live."
  />
</svelte:head>

<div class="page">
  <!-- HERO -->
  <section class="hero">
    <div class="hero-inner">
      <h1>Download the App.<br /><em>Start Moving Smarter</em></h1>
      <p class="sub">
        Get real-time matatu tracking, arrival alerts, and smarter route
        decisions — all in your pocket.
      </p>

      <div class="store-buttons">
        <!-- Replace with real links -->
        <a href="#" class="store primary">Download for Android</a>
        <a href="#" class="store secondary">Download for iPhone</a>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="section">
    <div class="inner">
      <h2 class="section-title">Get Started in 3 Steps</h2>

      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-title">Install the App</div>
          <p class="step-desc">
            Download Matatu Pulse from your app store in seconds.
          </p>
        </div>

        <div class="step">
          <div class="step-num">2</div>
          <div class="step-title">Choose Your Route</div>
          <p class="step-desc">
            Search your route or nearby stage to see live vehicles.
          </p>
        </div>

        <div class="step">
          <div class="step-num">3</div>
          <div class="step-title">Track & Ride</div>
          <p class="step-desc">Get notified and board at the perfect time.</p>
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
    padding: 110px 2rem 90px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 55% 65% at 50% -10%,
      rgba(242, 101, 34, 0.15),
      transparent 60%
    );
  }
  .hero-inner {
    position: relative;
    max-width: 680px;
    margin: 0 auto;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 6vw, 3.6rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 18px;
  }
  h1 em {
    color: var(--orange);
    font-style: normal;
  }

  .sub {
    font-size: 1.05rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 40px;
  }

  .store-buttons {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .store {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 26px;
    border-radius: 100px;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.9rem;
    transition:
      transform 0.15s,
      box-shadow 0.2s;
  }

  .store.primary {
    background: var(--orange);
    color: #fff;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.35);
  }
  .store.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(242, 101, 34, 0.45);
  }

  .store.secondary {
    border: 1px solid var(--rim-2);
    color: var(--text-2);
  }
  .store.secondary:hover {
    transform: translateY(-2px);
    border-color: var(--rim);
    color: var(--text-1);
  }

  .section {
    padding: 80px 2rem;
    border-top: 1px solid var(--rim);
  }
  .inner {
    max-width: 900px;
    margin: 0 auto;
    text-align: center;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 40px;
  }

  .step {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    padding: 26px 22px;
  }

  .step-num {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(242, 101, 34, 0.12);
    color: var(--orange);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
  }

  .step-title {
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .step-desc {
    font-size: 0.85rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  @media (max-width: 700px) {
    .steps {
      grid-template-columns: 1fr;
    }
  }
</style>
