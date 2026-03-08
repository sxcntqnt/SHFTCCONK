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

  // Data from +page.ts smart router
  let { data } = $props()

  onMount(() => {
    loadFavoriteData()
  })

  // Set adminSection context so sidebar highlights "dashboard"
  const adminSectionStore: Writable<string> = getContext("adminSection")
  $effect(() => {
    if (browser && adminSectionStore) adminSectionStore.set("dashboard")
  })

  // Dismiss the onboarding banner
  let showOnboardingBanner = $state(!!data.onboardingComplete)
</script>

<svelte:head>
  <title>Home — Matatu Pulse</title>
</svelte:head>

<!-- ═══ Post-onboarding banner ═══ -->
{#if showOnboardingBanner}
  <div class="onboarding-banner">
    <div class="banner-icon">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </div>
    <div class="banner-content">
      <div class="banner-title">Welcome to Matatu Pulse!</div>
      {#if data.requestedRole && data.requestedRole !== "PASSENGER"}
        <div class="banner-sub">
          Your <strong
            >{data.requestedRole.replace("_", " ").toLowerCase()}</strong
          > request is being reviewed. You can use the app as a passenger while you
          wait.
        </div>
      {:else}
        <div class="banner-sub">Your profile is set up and ready to go.</div>
      {/if}
    </div>
    <button
      class="banner-dismiss"
      onclick={() => (showOnboardingBanner = false)}
      aria-label="Dismiss"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
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
{/if}

<!-- ═══ Reason banner (from redirects) ═══ -->
{#if data.reason}
  <div class="reason-banner">
    {#if data.reason === "not_admin"}
      You don't have admin access. Contact your administrator for elevation.
    {:else if data.reason === "no_access"}
      You don't have access to that organization.
    {:else if data.reason === "no_org_access"}
      You're not a member of any organization yet.
    {:else}
      {data.reason.replace(/_/g, " ")}
    {/if}
  </div>
{/if}

<!-- ═══ Multi-dashboard selector (when user has multiple roles) ═══ -->
{#if data.destinations && data.destinations.length > 0}
  <div class="dash-page">
    <div class="dash-header">
      <div>
        <div class="header-eyebrow">
          <span class="live-dot"></span>
          Dashboard
        </div>
        <h1 class="dash-title">Where to, <em>today?</em></h1>
        <p class="dash-sub">
          You have access to multiple dashboards. Pick one or stay here.
        </p>
      </div>
    </div>

    <div class="dest-grid">
      {#each data.destinations as dest}
        <a href={dest.href} class="dest-card">
          <span class="dest-icon">{dest.icon}</span>
          <div>
            <div class="dest-label">{dest.label}</div>
            <div class="dest-desc">{dest.description}</div>
          </div>
          <svg
            class="dest-arrow"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      {/each}
    </div>

    <div class="section-divider"></div>
    <p class="stay-hint">Or scroll down for your passenger dashboard.</p>
  </div>
{/if}

<!-- ═══ Passenger dashboard (always shown) ═══ -->
<div class="dash-page">
  {#if !data.destinations || data.destinations.length === 0}
    <!-- Only show header if no destination selector above -->
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
  {/if}

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

  /* ── Onboarding banner ── */
  .onboarding-banner {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    margin-bottom: 24px;
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 14px;
  }
  .banner-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(0, 176, 155, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--teal);
    flex-shrink: 0;
  }
  .banner-content {
    flex: 1;
  }
  .banner-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .banner-sub {
    font-size: 0.78rem;
    color: var(--text-3);
    line-height: 1.5;
  }
  .banner-sub strong {
    color: var(--teal);
    text-transform: capitalize;
  }
  .banner-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    opacity: 0.6;
    padding: 4px;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .banner-dismiss:hover {
    opacity: 1;
  }

  /* ── Reason banner ── */
  .reason-banner {
    padding: 12px 18px;
    margin-bottom: 20px;
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.2);
    border-radius: 12px;
    font-size: 0.82rem;
    color: var(--orange);
    text-transform: capitalize;
  }

  /* ── Destination selector ── */
  .dest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .dest-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.03);
    text-decoration: none;
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.15s;
  }
  .dest-card:hover {
    border-color: rgba(242, 101, 34, 0.35);
    background: rgba(242, 101, 34, 0.06);
    transform: translateY(-1px);
  }
  .dest-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  .dest-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .dest-desc {
    font-size: 0.72rem;
    color: var(--text-3);
    line-height: 1.4;
  }
  .dest-arrow {
    margin-left: auto;
    color: var(--text-3);
    opacity: 0.4;
    flex-shrink: 0;
    transition:
      opacity 0.15s,
      color 0.15s;
  }
  .dest-card:hover .dest-arrow {
    opacity: 1;
    color: var(--orange);
  }
  .stay-hint {
    font-size: 0.75rem;
    color: var(--text-3);
    text-align: center;
    margin-bottom: 24px;
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
  .header-search {
    flex-shrink: 0;
  }

  /* ── Top grid ── */
  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
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

  /* ── Loading ── */
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

  /* ── Crew grid ── */
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
    .dest-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
