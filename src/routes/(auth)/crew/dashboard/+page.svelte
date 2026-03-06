<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"

  // ── Shared / Auth ───────────────────────────────────────
  import { authStore, hasPermission } from "$lib/features/auth/stores/auth"

  // ── Operator / Fleet imports ────────────────────────────
  import FleetMap from "$lib/components/FleetMap.svelte" // adjust paths
  import Contracts from "$lib/components/Contracts.svelte"
  import Analytics from "$lib/components/Analytics.svelte"
  import { initFleet } from "$lib/features/fleet/stores/fleet"
  import { initContracts } from "$lib/features/contracts/contracts"
  import { initAnalytics } from "$lib/features/analytics/+analytics"

  // ── User / Crew imports ─────────────────────────────────
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

  // ── Stores & state ──────────────────────────────────────
  let user = $authStore
  $: user = $authStore

  // Reactive permissions (for operator features)
  $: isOperator =
    hasPermission("fleet.view") ||
    hasPermission("contract.assign") ||
    hasPermission("analytics.view")
  $: canAssignContracts = hasPermission("contract.assign")
  $: canViewAnalytics = hasPermission("analytics.view")

  let initialized = false
  let loading = true

  // Context for sidebar highlight (from second file)
  const adminSectionStore: Writable<string> | undefined =
    getContext("adminSection")

  onMount(async () => {
    if (browser) {
      // Sidebar highlight
      if (adminSectionStore) adminSectionStore.set("home") // or "dashboard"

      // Load user-specific favorites
      loadFavoriteData()

      // Initialize operator feeds only if relevant role
      if (isOperator && !initialized) {
        initialized = true
        await Promise.all([initFleet(), initContracts(), initAnalytics()])
      }

      loading = false
    }
  })
</script>

<svelte:head>
  <title>Dashboard — Matatu Pulse</title>
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] p-6 font-sans dash-page"
>
  <!-- ── Unified Header ─────────────────────────────────────── -->
  <header class="dash-header mb-10">
    <div>
      {#if user}
        <div class="header-eyebrow">
          <span class="live-dot"></span>
          Dashboard
        </div>
        <h1 class="dash-title">
          Good {user.fullName ? `back, ${user.fullName}` : "morning"},
          <em>Nairobi</em>
        </h1>
        <p class="dash-sub">
          Here's what's happening on your corridors right now.
        </p>
      {:else}
        <h1
          class="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          Dashboard
        </h1>
      {/if}
    </div>

    <div class="header-search">
      <SearchBar />
    </div>
  </header>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div
        class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"
      ></div>
    </div>
  {:else}
    <!-- ── Top row: Next Trip + Quick Planner ─────────────────── -->
    <div class="top-grid mb-8">
      <NextTripCard />
      <QuickPlanner />
    </div>

    <!-- ── Insights ───────────────────────────────────────────── -->
    <div class="insights-row mb-10">
      <InsightsSnapshot />
    </div>

    <!-- ── Operator-only sections (Fleet Manager / Admin view) ── -->
    {#if isOperator}
      <section class="mb-16">
        <h2 class="text-3xl font-semibold mb-6">Fleet Overview</h2>
        <FleetMap />
      </section>

      {#if canAssignContracts}
        <section class="mb-16">
          <h2 class="text-3xl font-semibold mb-6">Contracts</h2>
          <Contracts />
        </section>
      {/if}

      {#if canViewAnalytics}
        <section class="mb-16">
          <h2 class="text-3xl font-semibold mb-6">Analytics</h2>
          <Analytics />
        </section>
      {/if}

      <div class="section-divider my-12"></div>
    {/if}

    <!-- ── Favourites ─────────────────────────────────────────── -->
    <div class="section-head mb-6">
      <div>
        <div class="section-title">Favourites</div>
        <div class="section-sub">
          Your saved drivers, matatus and conductors
        </div>
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

    <div class="section-divider my-10"></div>

    <!-- ── Support the Crew ───────────────────────────────────── -->
    <div class="section-head mb-6">
      <div>
        <div class="section-title">Support the Crew</div>
        <div class="section-sub">
          Tip or rate the driver and conductor from your last trip
        </div>
      </div>
    </div>

    <div class="crew-grid mb-10">
      <TipCrew
        driverName="Selected Driver"
        conductorName="Selected Conductor"
        onTip={(d, c) =>
          console.log(`Tip: Driver ${d} KES • Conductor ${c} KES`)}
      />
      <RateCrew
        onRate={(stars, text) => console.log(`Rated ${stars} stars: ${text}`)}
      />
    </div>

    <div class="section-divider my-10"></div>

    <!-- ── Remembered Matatus ─────────────────────────────────── -->
    <div class="section-head mb-6">
      <div>
        <div class="section-title">Remembered Matatus</div>
        <div class="section-sub">
          Vehicles you've flagged for tracking or reference
        </div>
      </div>
    </div>

    <RememberMatatu remembered={$rememberedMatatus} />

    <div class="section-divider my-10"></div>

    <!-- ── Learn More ─────────────────────────────────────────── -->
    <LearnMore />
  {/if}
</div>

<style>
  /* ── Combine & clean up styles from both files ── */
  .dash-page {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .dash-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 40px;
    flex-wrap: wrap;
  }

  .header-eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange, #f26522);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--teal, #00b09b);
    animation: pulse-dot 2s ease-out infinite;
  }

  @keyframes pulse-dot {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.6);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  .dash-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.05;
    background: linear-gradient(90deg, #3b82f6, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .dash-sub {
    color: #6b7280;
    margin-top: 8px;
  }

  .top-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .insights-row {
    margin-bottom: 40px;
  }

  .section-head {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #111827;
  }

  .section-sub {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 4px;
  }

  .crew-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .section-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 40px 0;
  }

  .loading-state,
  .spinner {
    /* ... keep your existing spinner styles */
  }

  @media (max-width: 1024px) {
    .top-grid,
    .crew-grid {
      grid-template-columns: 1fr;
    }
    .dash-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
