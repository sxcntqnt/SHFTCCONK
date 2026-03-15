<script lang="ts">
  import { createEventDispatcher } from "svelte"

  let {
    temperature,
    windspeed,
    weathercode,
    time,
    location,
    source,
  }: {
    temperature: number
    windspeed: number
    weathercode: number
    time: string
    location: string
    source: "search" | "map-click" | "geofence" | "default"
  } = $props()

  const dispatch = createEventDispatcher()

  function remove() {
    dispatch("remove", { location })
  }

  const formattedTime = new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  // Temperature gradient — kept from original
  let tempGradient = $derived(
    isNaN(temperature)
      ? ["#9ca3af", "#6b7280"]
      : temperature <= 10
        ? ["#60a5fa", "#2563eb"]
        : temperature <= 22
          ? ["#22d3ee", "#0ea5e9"]
          : temperature <= 30
            ? ["#facc15", "#f97316"]
            : ["#f97316", "#ef4444"],
  )

  // WMO condition from weathercode
  function getCondition(code: number): { label: string; icon: string } {
    if (code === 0) return { label: "Clear Sky", icon: "☀️" }
    if (code <= 2) return { label: "Partly Cloudy", icon: "⛅" }
    if (code === 3) return { label: "Overcast", icon: "☁️" }
    if (code <= 49) return { label: "Foggy", icon: "🌫️" }
    if (code <= 57) return { label: "Drizzle", icon: "🌦️" }
    if (code <= 67) return { label: "Rain", icon: "🌧️" }
    if (code <= 77) return { label: "Snow", icon: "❄️" }
    if (code <= 82) return { label: "Rain Showers", icon: "🌦️" }
    if (code <= 86) return { label: "Snow Showers", icon: "🌨️" }
    if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" }
    return { label: "Unknown", icon: "🌡️" }
  }

  let condition = $derived(getCondition(weathercode))
</script>

<div class="card">
  <!-- Top sheen -->
  <div class="shine" aria-hidden="true"></div>

  <!-- Ghost weather icon fills dead right-side space -->
  <div class="bg-icon" aria-hidden="true">{condition.icon}</div>

  <!-- ── Header ── -->
  <div class="header">
    <div>
      <p class="location">{location}</p>
      <div class="condition-row">
        <span class="condition-icon" aria-hidden="true">{condition.icon}</span>
        <span class="condition-label">{condition.label}</span>
      </div>
    </div>
    <div class="header-right">
      <span class="badge">{source}</span>
      <button
        class="close-btn"
        on:click={remove}
        aria-label="Remove {location}"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.8"
          stroke-linecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" /><line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          />
        </svg>
      </button>
    </div>
  </div>

  <!-- ── Temperature ── -->
  <div class="temp-row">
    <span
      class="temp-num"
      style="background: linear-gradient(170deg, {tempGradient[0]} 30%, {tempGradient[1]} 100%);
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
    >
      {Math.round(temperature)}
    </span>
    <div class="temp-unit">
      <span class="temp-deg">°</span>
      <span class="temp-scale">C</span>
    </div>
  </div>

  <!-- ── Divider ── -->
  <div class="divider" aria-hidden="true"></div>

  <!-- ── Stats ── -->
  <div class="stats">
    <div class="stat">
      <span class="stat-label">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path
            d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"
          />
        </svg>
        Wind
      </span>
      <span class="stat-value"
        >{Math.round(windspeed)} <span class="stat-unit">km/h</span></span
      >
    </div>
    <div class="stat-sep" aria-hidden="true"></div>
    <div class="stat">
      <span class="stat-label">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" /><polyline
            points="12 6 12 12 16 14"
          />
        </svg>
        Updated
      </span>
      <span class="stat-value">{formattedTime}</span>
    </div>
  </div>
</div>

<style>
  /* ── Card shell ── */
  .card {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    padding: 22px 24px 20px;
    width: 100%;

    background: linear-gradient(
      145deg,
      rgba(22, 38, 88, 0.58) 0%,
      rgba(10, 18, 52, 0.72) 100%
    );
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);

    /* Asymmetric rim — bright top-left, dark bottom-right */
    border-top: 1px solid rgba(140, 185, 255, 0.22);
    border-left: 1px solid rgba(140, 185, 255, 0.14);
    border-right: 1px solid rgba(8, 15, 45, 0.6);
    border-bottom: 1px solid rgba(8, 15, 45, 0.6);

    box-shadow:
      0 2px 0 rgba(160, 200, 255, 0.08) inset,
      0 28px 56px rgba(0, 0, 0, 0.45),
      0 8px 20px rgba(0, 8, 36, 0.5);

    transition:
      transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1),
      box-shadow 0.22s ease;
  }
  .card:hover {
    transform: translateY(-3px);
    box-shadow:
      0 2px 0 rgba(160, 200, 255, 0.12) inset,
      0 36px 72px rgba(0, 0, 0, 0.5),
      0 12px 28px rgba(0, 8, 36, 0.55),
      0 0 40px rgba(40, 100, 220, 0.08);
  }

  /* Thin highlight along the top edge */
  .shine {
    position: absolute;
    top: 0;
    left: 15%;
    right: 15%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(180, 220, 255, 0.32),
      transparent
    );
    pointer-events: none;
  }

  /* Ghost icon — fills dead space on the right */
  .bg-icon {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-55%);
    font-size: 7rem;
    opacity: 0.07;
    filter: blur(3px);
    pointer-events: none;
    user-select: none;
    line-height: 1;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
  }
  .location {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: rgba(255, 255, 255, 0.92);
    line-height: 1;
    margin: 0 0 5px;
  }
  .condition-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .condition-icon {
    font-size: 0.78rem;
    line-height: 1;
  }
  .condition-label {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: rgba(160, 200, 255, 0.6);
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .badge {
    font-size: 0.58rem;
    padding: 3px 9px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(160, 200, 255, 0.5);
    white-space: nowrap;
  }
  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.15s,
      color 0.15s,
      transform 0.12s;
  }
  .close-btn:hover {
    background: rgba(248, 113, 113, 0.15);
    border-color: rgba(248, 113, 113, 0.25);
    color: #f87171;
    transform: scale(1.1);
  }

  /* ── Temperature ── */
  .temp-row {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
    line-height: 1;
  }
  .temp-num {
    font-size: 5.2rem;
    font-weight: 200;
    letter-spacing: -0.04em;
    line-height: 0.9;
  }
  .temp-unit {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-top: 6px;
    gap: 1px;
  }
  .temp-deg {
    font-size: 1.5rem;
    font-weight: 300;
    color: rgba(200, 225, 255, 0.6);
    line-height: 1;
  }
  .temp-scale {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: rgba(160, 200, 255, 0.45);
  }

  /* ── Divider ── */
  .divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.03) 60%,
      transparent
    );
    margin-bottom: 14px;
  }

  /* ── Stats ── */
  .stats {
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-sep {
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.07);
    margin: 0 20px;
    flex-shrink: 0;
  }
  .stat-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(160, 200, 255, 0.4);
  }
  .stat-value {
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1;
  }
  .stat-unit {
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.35);
  }
</style>
