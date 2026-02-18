<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let temperature: number;
  export let windspeed: number;
  export let weathercode: number;
  export let time: string;
  export let location: string;
  export let source: 'search' | 'map-click' | 'geofence';

  const dispatch = createEventDispatcher();

  function remove() {
    dispatch('remove', { location });
  }

  const formattedTime = new Date(time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  $: tempColor =
    isNaN(temperature) ? 'from-gray-500 to-gray-700' :
    temperature <= 10 ? 'from-blue-400 to-blue-600' :
    temperature <= 22 ? 'from-cyan-400 to-sky-500' :
    temperature <= 30 ? 'from-yellow-400 to-orange-500' :
    'from-orange-500 to-red-500';
</script>

<div class="weather-glass w-full max-w-xl p-8 flex flex-col gap-6 relative">
  <!-- REMOVE BUTTON -->
  <button class="remove-btn" on:click={remove} aria-label="Remove location">
    ✕
  </button>

  <!-- Location Header -->
  <div class="flex flex-col">
    <span class="text-white/70 text-sm tracking-wide">{location}</span>
    <div class="flex items-center gap-2">
      <span class="text-white text-3xl font-semibold">Current Weather</span>
      <span class="badge">{source}</span>
    </div>
  </div>

  <!-- Temperature -->
  <div class="flex items-end gap-3">
    <div class={`text-7xl font-light bg-gradient-to-b ${tempColor} bg-clip-text text-transparent`}>
      {Math.round(temperature)}°
    </div>
    <div class="text-white/60 text-lg mb-3">C</div>
  </div>

  <!-- Info Row -->
  <div class="grid grid-cols-2 gap-4">
    <div class="stat">
      <span class="stat-label">Wind</span>
      <span class="stat-value">{Math.round(windspeed)} km/h</span>
    </div>
    <div class="stat">
      <span class="stat-label">Updated</span>
      <span class="stat-value">{formattedTime}</span>
    </div>
  </div>
</div>

<style>
  .remove-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: none;
    background: rgba(255,255,255,0.15);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 16px;
  }
  .remove-btn:hover {
    background: rgba(255,80,80,0.7);
    transform: scale(1.1);
  }
  .badge {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: white;
  }
  .weather-glass {
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow:
      0 20px 60px rgba(0,0,0,0.25),
      inset 0 1px 0 rgba(255,255,255,0.2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stat-label {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
  }
  .stat-value {
    font-size: 20px;
    font-weight: 500;
    color: white;
  }
</style>