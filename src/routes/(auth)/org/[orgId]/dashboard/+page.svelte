<script lang="ts">
  import { onMount } from "svelte"
  import FleetMap from "./fleet-map.svelte"
  import Contracts from "./contracts.svelte"
  import Analytics from "./analytics.svelte"

  import { authStore, hasPermission } from "$lib/features/auth/stores/auth"
  import { initFleet } from "$lib/features/fleet/stores/fleet"
  import { initContracts } from "$lib/features/contracts/contracts"
  import { initAnalytics } from "$lib/features/analytics/+analytics"

  let user = $derived($authStore)

  // 2. Permission flags – assuming hasPermission(...) is a pure function
  //    that reads some reactive source internally (e.g. $authStore.role, user.permissions, etc.)
  //    → use $derived for each flag
  let canAssignContracts = $derived(hasPermission("contract.assign"))

  let canViewAnalytics = $derived(hasPermission("analytics.view"))

  let initialized = false
  let loading = true

  onMount(async () => {
    if (!initialized) {
      initialized = true

      // Initialize feeds in parallel
      await Promise.all([initFleet(), initContracts(), initAnalytics()])

      loading = false
    }
  })
</script>

<div
  class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] p-6 font-sans"
>
  <!-- HEADER -->
  <header class="text-center mb-12">
    <h1
      class="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
    >
      Operator Dashboard
    </h1>

    {#if user}
      <p class="text-gray-600 mt-3 text-lg">
        Welcome back, <span class="font-semibold">{user.fullName}</span>
      </p>
    {/if}
  </header>

  <!-- LOADING STATE -->
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div
        class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"
      ></div>
    </div>
  {:else}
    <!-- FLEET MAP -->
    <section class="mb-16">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-semibold">Fleet Map</h2>
      </div>

      <FleetMap />
    </section>

    <!-- CONTRACTS -->
    {#if canAssignContracts}
      <section class="mb-16">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-semibold">Contracts</h2>
        </div>

        <Contracts />
      </section>
    {/if}

    <!-- ANALYTICS -->
    {#if canViewAnalytics}
      <section class="mb-16">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-semibold">Analytics</h2>
        </div>

        <Analytics />
      </section>
    {/if}
  {/if}
</div>
