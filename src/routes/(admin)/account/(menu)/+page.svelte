<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { browser } from "$app/environment"
  import SearchBar from "$lib/components/SearchBar.svelte"
  import Favorites from "$lib/components/Favorites.svelte"
  import TipCrew from "$lib/components/TipCrew.svelte"
  import RateCrew from "$lib/components/RateCrew.svelte"
  import RememberMatatu from "$lib/components/RememberMatatu.svelte"
  import LearnMore from "$lib/components/LearnMore.svelte"
  import NextTripCard from "$lib/components/NextTripCard.svelte"
  import QuickPlanner from "$lib/components/QuickPlanner.svelte"
  import InsightsSnapshot from "$lib/components/InsightsSnapshot.svelte"
  import {
    filteredDrivers,
    filteredMatatus,
    filteredConductors,
    rememberedMatatus,
    isLoadingFavorites,
    loadFavoriteData,
  } from "$lib/features/dashboard/stores/DashboardStore"
  import { onMount } from "svelte"

  onMount(() => {
    loadFavoriteData()
  })

  // Set adminSection context to "home" so the sidebar highlights correctly
  const adminSectionStore: Writable<string> = getContext("adminSection")
  $effect(() => {
    if (browser && adminSectionStore) adminSectionStore.set("home")
  })
</script>

<svelte:head>
  <title>Home — Matatu Pulse</title>
</svelte:head>

<div class="dash-page">
  <!-- ── Header ── -->
  <div class="dash-header">
    <div>
      <div class="header-eyebrow">
        <span class="live-dot"></span>
        Dashboard
      </div>
      <h1 class="dash-title">Good morning, <em>Nairobi</em></h1>
      <p class="dash-sub">
        Here's what's happening on your corridors right now.
      </p>
    </div>
    <div class="header-search">
      <SearchBar />
    </div>
  </div>

  <!-- ── Trip card + planner ── -->
  <div class="top-grid">
    <NextTripCard />
    <QuickPlanner />
  </div>

  <!-- ── Weekly insights ── -->
  <div class="insights-row">
    <InsightsSnapshot />
  </div>

  <div class="section-divider"></div>

  <!-- ── Favourites ── -->
  <div class="section-head">
    <div>
      <div class="section-title">Favourites</div>
      <div class="section-sub">Your saved drivers, matatus and conductors</div>
    </div>
  </div>

  {#if $isLoadingFavorites}
    <div class="loading-state">
      <span class="spinner"></span>
      Loading favourites…
    </div>
  {:else}
    <Favorites
      filteredDrivers={$filteredDrivers}
      filteredMatatus={$filteredMatatus}
      filteredConductors={$filteredConductors}
    />
  {/if}

  <div class="section-divider"></div>

  <!-- ── Support the crew ── -->
  <div class="section-head">
    <div>
      <div class="section-title">Support the Crew</div>
      <div class="section-sub">
        Tip or rate the driver and conductor from your last trip
      </div>
    </div>
  </div>
  <div class="crew-grid">
    <TipCrew
      driverName="Selected Driver"
      conductorName="Selected Conductor"
      onTip={(d, c) => console.log(`Tip: Driver ${d} KES • Conductor ${c} KES`)}
    />
    <RateCrew
      onRate={(stars, text) => console.log(`Rated ${stars} stars: ${text}`)}
    />
  </div>

  <div class="section-divider"></div>

  <!-- ── Remember Matatu ── -->
  <div class="section-head">
    <div>
      <div class="section-title">Remembered Matatus</div>
      <div class="section-sub">
        Vehicles you've flagged for tracking or reference
      </div>
    </div>
  </div>
  <RememberMatatu remembered={$rememberedMatatus} />

  <div class="section-divider"></div>

  <!-- ── Learn More ── -->
  <LearnMore />
</div>

<style>
  /* ── Page shell ── */
  .dash-page {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100%;
  }

  /* ── Page header ── */
  .dash-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }

  .header-eyebrow {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* Live pulse */
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-dot 2s ease-out infinite;
  }
  @keyframes pulse-dot {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  .dash-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
  }
  .dash-title em {
    font-style: normal;
    background: linear-gradient(90deg, #f26522, #ff8c4b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dash-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    margin-top: 6px;
    line-height: 1.6;
  }

  /* Search slot */
  .header-search {
    flex-shrink: 0;
  }

  /* ── Top grid: trip card + planner ── */
  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  /* ── Insights full-width ── */
  .insights-row {
    margin-bottom: 32px;
  }

  /* ── Section heading ── */
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .section-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .section-sub {
    font-size: 0.75rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  /* ── Loading spinner ── */
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    gap: 12px;
    color: var(--text-3);
    font-size: 0.82rem;
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Support crew grid ── */
  .crew-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  /* ── Divider ── */
  .section-divider {
    height: 1px;
    background: var(--rim);
    margin: 32px 0;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .top-grid {
      grid-template-columns: 1fr;
    }
    .crew-grid {
      grid-template-columns: 1fr;
    }
    .dash-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
