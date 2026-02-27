<script>
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Favorites from '$lib/components/Favorites.svelte';
  import TipCrew from '$lib/components/TipCrew.svelte';
  import RateCrew from '$lib/components/RateCrew.svelte';
  import RememberMatatu from '$lib/components/RememberMatatu.svelte';
  import LearnMore from '$lib/components/LearnMore.svelte';
  import NextTripCard from '$lib/components/NextTripCard.svelte';
  import QuickPlanner from '$lib/components/QuickPlanner.svelte';
  import InsightsSnapshot from '$lib/components/InsightsSnapshot.svelte';

  import {
favoriteDrivers,
    filteredDrivers,
    filteredMatatus,
    filteredConductors,
    rememberedMatatus,
    filteredRememberedMatatus,    
    isLoadingFavorites,
    loadFavoriteData
  } from '$lib/features/dashboard/stores/DashboardStore';

  import { onMount } from 'svelte';

  onMount(() => {
    loadFavoriteData();
  });
</script>

<main class="min-h-screen bg-base-100 font-sans antialiased">
  <header class="bg-base-200 shadow p-4">
    <h1 class="text-2xl font-bold text-center text-base-content">
      Mobility Transportation Gateway
    </h1>
    <SearchBar />
  </header>
<div class="dashboard">
  <NextTripCard />
  <QuickPlanner />
  <InsightsSnapshot />
</div>
  {#if $isLoadingFavorites}
    <div class="flex justify-center items-center h-32">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <section class="p-4">
      <h2 class="text-xl font-semibold mb-4 text-base-content">Favorites</h2>
      <Favorites
        filteredDrivers={$filteredDrivers}
        filteredMatatus={$filteredMatatus}
        filteredConductors={$filteredConductors}  
      />
    </section>

 <section class="p-6 card bg-base-100 shadow-xl mx-4 mb-6">
  <div class="card-body">
    <h2 class="card-title text-2xl mb-6 text-base-content">Support the Crew</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Tip Crew -->
      <div class="w-full">
        <TipCrew
          driverName="Selected Driver"
          conductorName="Selected Conductor"
          onTip={(d, c) => console.log(`Tip: Driver ${d} KES • Conductor ${c} KES`)}
        />
      </div>

      <!-- Rate Crew -->
      <div class="w-full">
        <RateCrew
          onRate={(stars, text) => console.log(`Rated ${stars} stars: ${text}`)}
        />
      </div>
    </div>
  </div>
</section>

    <section class="p-4 card bg-base-100 shadow-xl mx-4 mb-4">
      <div class="card-body">
        <h2 class="card-title text-base-content">Remember Matatu</h2>
        <RememberMatatu remembered={$rememberedMatatus} />
      </div>
    </section>

    <section class="p-4">
      <LearnMore />
    </section>
  {/if}
</main>

<style>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1rem;
}

@media(min-width:768px){
  .dashboard{
    max-width: 900px;
    auto;
  }
}
</style>
