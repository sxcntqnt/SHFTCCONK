<script lang="ts">
  import WeatherCard from '$lib/features/weather/WeatherCard.svelte';
  import { weatherCards, upsertWeather, removeWeather } from '$lib/features/weather/stores/WeatherStore';
  import { fetchWeather } from '$lib/features/weather/services/weatherApi';

  export let data;

  // Hydrate from SSR / load function if provided
  if (data?.weather) {
    upsertWeather(data.weather);
  }

  let query = '';
  let loading = false;
  let errorMessage = '';

  async function search() {
    const trimmed = query.trim();
    if (!trimmed) return;

    loading = true;
    errorMessage = '';

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`
      );

      if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.status}`);

      const geoData = await geoRes.json();

      if (!geoData.results?.length) {
        errorMessage = `No location found for "${trimmed}"`;
        return;
      }

      const place = geoData.results[0];

      const weather = await fetchWeather(
        place.latitude,
        place.longitude,
        place.name, // or: `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}, ${place.country_code}`
        'search'
      );

      upsertWeather(weather);
      query = '';
    } catch (err) {
      console.error('Weather search failed:', err);
      errorMessage = err instanceof Error ? err.message : 'Something went wrong — try again';
    } finally {
      loading = false;
    }
  }
</script>

<div class="weather-bg min-h-screen w-full flex flex-col items-center p-6">
  <!-- Search bar -->
  <div class="search mb-10 w-full max-w-lg">
    <input
      placeholder="Search any place…"
      bind:value={query}
      on:keydown={(e) => e.key === 'Enter' && search()}
      disabled={loading}
    />
    <button on:click={search} disabled={loading}>
      {loading ? '…' : 'Add'}
    </button>
  </div>

  {#if errorMessage}
    <div class="error mb-6 text-center">{errorMessage}</div>
  {/if}

  <h1 class="title mb-10">Weather</h1>

  {#if $weatherCards.length > 0}
    <div
      class="grid gap-6 w-full max-w-5xl"
      style="grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));"
    >
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
    <div class="error mt-6 text-center">
      No locations added yet — search for a city or place above
    </div>
  {/if}
</div>

<style>
  .weather-bg {
    background:
      radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.25), transparent),
      linear-gradient(180deg, #3a7bd5 0%, #2a5298 40%, #1b2735 100%);
  }
  .title {
    font-size: 3.5rem;
    font-weight: 700;
    color: white;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .error {
    color: #ffcccc;
    font-size: 1.2rem;
    opacity: 0.9;
  }
  .search {
    display: flex;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 9999px;
    backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.13);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }
  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-size: 1.1rem;
  }
  input::placeholder {
    color: rgba(255, 255, 255, 0.65);
  }
  button {
    padding: 10px 24px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.22);
    color: white;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.35);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>