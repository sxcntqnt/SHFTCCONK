<script lang="ts">
  import WeatherCard from "$lib/features/weather/WeatherCard.svelte"
  import {
    weatherCards,
    upsertWeather,
    removeWeather,
  } from "$lib/features/weather/stores/WeatherStore"
  import { fetchWeather } from "$lib/features/weather/services/weatherApi"

  let { data }: { data: any } = $props()

  if (data?.weather) {
    upsertWeather(data.weather)
  }

  let query = ""
  let loading = false
  let errorMessage = ""
  let inputFocused = false

  async function search() {
    const trimmed = query.trim()
    if (!trimmed) return

    loading = true
    errorMessage = ""

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`,
      )
      if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`)
      const geoData = await geoRes.json()

      if (!geoData.results?.length) {
        errorMessage = `No location found for "${trimmed}"`
        return
      }

      const place = geoData.results[0]
      const weather = await fetchWeather(
        place.latitude,
        place.longitude,
        place.name,
        "search",
      )

      upsertWeather(weather)
      query = ""
    } catch (err) {
      console.error("Weather search failed:", err)
      errorMessage =
        err instanceof Error ? err.message : "Something went wrong — try again"
    } finally {
      loading = false
    }
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="page">
  <!-- Atmospheric layers -->
  <div class="atm atm-1" aria-hidden="true"></div>
  <div class="atm atm-2" aria-hidden="true"></div>
  <div class="atm atm-3" aria-hidden="true"></div>
  <div class="stars" aria-hidden="true"></div>

  <div class="content">
    <!-- Header -->
    <header class="header">
      <p class="eyebrow">Live Atmospheric Conditions</p>
      <h1 class="title">
        <span class="title-italic">Weather</span>
        <span class="title-rule" aria-hidden="true"></span>
        <span class="title-sub">Dashboard</span>
      </h1>
    </header>

    <!-- Search -->
    <div class="search-wrap" class:focused={inputFocused}>
      <span class="search-icon" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
        </svg>
      </span>
      <input
        class="search-input"
        placeholder="Search any city or place…"
        bind:value={query}
        on:focus={() => (inputFocused = true)}
        on:blur={() => (inputFocused = false)}
        on:keydown={(e) => e.key === "Enter" && search()}
        disabled={loading}
        aria-label="Search location"
      />
      <button
        class="search-btn"
        on:click={search}
        disabled={loading}
        aria-label="Add location"
      >
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
        {:else}
          <span>Add</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" /><line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
        {/if}
      </button>
    </div>

    {#if errorMessage}
      <div class="error-msg" role="alert">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" /><line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {errorMessage}
      </div>
    {/if}

    <!-- Cards -->
    {#if $weatherCards.length > 0}
      <div class="cards-grid">
        {#each $weatherCards as weather (weather.name)}
          <WeatherCard
            temperature={weather.temperature}
            windspeed={weather.windspeed}
            weathercode={weather.weathercode}
            time={weather.time}
            location={weather.name}
            source={weather.source}
            on:remove={(e) => removeWeather(e.detail.location)}
          />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-orb" aria-hidden="true"></div>
        <p class="empty-label">No locations tracked yet</p>
        <p class="empty-sub">Search for a city above to begin</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* ── Base ── */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .page {
    font-family: "DM Sans", sans-serif;
    min-height: 100svh;
    width: 100%;
    position: relative;
    overflow: hidden;
    background: #08091a;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── Atmospheric Background ── */
  .atm {
    position: fixed;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    z-index: 0;
  }
  .atm-1 {
    width: 900px;
    height: 700px;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    background: radial-gradient(
      ellipse,
      rgba(41, 98, 210, 0.55) 0%,
      transparent 70%
    );
    animation: drift1 18s ease-in-out infinite alternate;
  }
  .atm-2 {
    width: 600px;
    height: 500px;
    bottom: -100px;
    right: -100px;
    background: radial-gradient(
      ellipse,
      rgba(15, 60, 140, 0.45) 0%,
      transparent 70%
    );
    animation: drift2 22s ease-in-out infinite alternate;
  }
  .atm-3 {
    width: 400px;
    height: 300px;
    top: 40%;
    left: -60px;
    background: radial-gradient(
      ellipse,
      rgba(80, 150, 255, 0.18) 0%,
      transparent 70%
    );
    animation: drift1 26s ease-in-out infinite alternate-reverse;
  }

  @keyframes drift1 {
    from {
      transform: translateX(-50%) translateY(0px) scale(1);
    }
    to {
      transform: translateX(-50%) translateY(30px) scale(1.07);
    }
  }
  @keyframes drift2 {
    from {
      transform: translate(0, 0) scale(1);
    }
    to {
      transform: translate(-30px, -20px) scale(1.1);
    }
  }

  /* Stars */
  .stars {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      radial-gradient(
        1px 1px at 10% 15%,
        rgba(255, 255, 255, 0.5) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 25% 40%,
        rgba(255, 255, 255, 0.3) 0%,
        transparent 100%
      ),
      radial-gradient(
        1.5px 1.5px at 40% 8%,
        rgba(255, 255, 255, 0.6) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 55% 30%,
        rgba(255, 255, 255, 0.4) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 70% 5%,
        rgba(255, 255, 255, 0.5) 0%,
        transparent 100%
      ),
      radial-gradient(
        2px 2px at 82% 20%,
        rgba(255, 255, 255, 0.35) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 92% 12%,
        rgba(255, 255, 255, 0.5) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 15% 60%,
        rgba(255, 255, 255, 0.2) 0%,
        transparent 100%
      ),
      radial-gradient(
        1px 1px at 60% 55%,
        rgba(255, 255, 255, 0.25) 0%,
        transparent 100%
      ),
      radial-gradient(
        1.5px 1.5px at 88% 48%,
        rgba(255, 255, 255, 0.3) 0%,
        transparent 100%
      );
  }

  /* ── Content ── */
  .content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1200px;
    padding: 64px 32px 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  /* ── Header ── */
  .header {
    text-align: center;
    margin-bottom: 52px;
    animation: fadeUp 0.8s ease both;
  }
  .eyebrow {
    font-family: "DM Sans", sans-serif;
    font-size: 0.72rem;
    font-weight: 400;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(140, 180, 255, 0.7);
    margin-bottom: 14px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 20px;
    justify-content: center;
    line-height: 1;
  }
  .title-italic {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(3.8rem, 8vw, 6.5rem);
    font-weight: 300;
    font-style: italic;
    color: #ffffff;
    letter-spacing: -0.01em;
  }
  .title-rule {
    display: block;
    width: 2px;
    height: clamp(2rem, 4vw, 3.5rem);
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(120, 170, 255, 0.5),
      transparent
    );
    flex-shrink: 0;
  }
  .title-sub {
    font-family: "DM Sans", sans-serif;
    font-size: clamp(0.85rem, 1.8vw, 1.15rem);
    font-weight: 300;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(140, 180, 255, 0.75);
    align-self: flex-end;
    padding-bottom: 0.5em;
  }

  /* ── Search ── */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 560px;
    margin-bottom: 48px;
    padding: 10px 10px 10px 20px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(24px) saturate(1.5);
    transition:
      border-color 0.25s,
      box-shadow 0.25s,
      background 0.25s;
    animation: fadeUp 0.8s 0.12s ease both;
  }
  .search-wrap.focused {
    border-color: rgba(100, 160, 255, 0.4);
    background: rgba(255, 255, 255, 0.09);
    box-shadow:
      0 0 0 4px rgba(80, 140, 255, 0.1),
      0 8px 40px rgba(0, 0, 0, 0.25);
  }
  .search-icon {
    color: rgba(160, 200, 255, 0.65);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-family: "DM Sans", sans-serif;
    font-size: 1rem;
    font-weight: 300;
    min-width: 0;
  }
  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
  .search-input:disabled {
    opacity: 0.5;
  }

  .search-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 24px;
    border-radius: 9999px;
    background: rgba(80, 140, 255, 0.35);
    border: 1px solid rgba(120, 170, 255, 0.3);
    color: white;
    font-family: "DM Sans", sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    letter-spacing: 0.03em;
  }
  .search-btn:hover:not(:disabled) {
    background: rgba(80, 140, 255, 0.55);
    transform: translateY(-1px);
    box-shadow: 0 4px 18px rgba(60, 120, 255, 0.3);
  }
  .search-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .search-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Error ── */
  .error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 180, 180, 0.9);
    font-size: 0.88rem;
    font-weight: 400;
    margin-top: -30px;
    margin-bottom: 30px;
    padding: 12px 20px;
    border-radius: 12px;
    background: rgba(255, 80, 80, 0.08);
    border: 1px solid rgba(255, 100, 100, 0.18);
    backdrop-filter: blur(10px);
    animation: fadeUp 0.3s ease both;
  }

  /* ── Cards ── */
  .cards-grid {
    display: grid;
    gap: 24px;
    width: 100%;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    animation: fadeUp 0.8s 0.22s ease both;
  }

  /* ── Empty State ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 48px;
    animation: fadeUp 0.8s 0.2s ease both;
  }
  .empty-orb {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(80, 140, 255, 0.15) 0%,
      transparent 70%
    );
    border: 1px solid rgba(100, 160, 255, 0.15);
    margin-bottom: 8px;
    position: relative;
  }
  .empty-orb::after {
    content: "";
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    border: 1px solid rgba(100, 160, 255, 0.12);
  }
  .empty-label {
    font-family: "Cormorant Garamond", serif;
    font-size: 1.5rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
  }
  .empty-sub {
    font-size: 0.82rem;
    color: rgba(140, 180, 255, 0.4);
    letter-spacing: 0.06em;
    font-weight: 300;
  }

  /* ── Animations ── */
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .content {
      padding: 48px 20px 60px;
    }
    .title {
      flex-direction: column;
      gap: 4px;
    }
    .title-rule {
      width: clamp(2rem, 8vw, 4rem);
      height: 1px;
    }
    .title-sub {
      align-self: center;
      padding-bottom: 0;
    }
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
