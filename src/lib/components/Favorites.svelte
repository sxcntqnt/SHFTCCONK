<!-- src/lib/components/Favorites.svelte -->
<script lang="ts">
  import { Heart } from "@lucide/svelte"
  import TipCrew from "$lib/components/TipCrew.svelte"

  import {
    favoriteDrivers,
    favoriteMatatus,
    favoriteConductors,
    addFavoriteDriver,
    addFavoriteMatatu,
    addFavoriteConductor,
  } from "$lib/features/dashboard/stores/DashboardStore.ts"

  let {
    filteredDrivers = [],
    filteredMatatus = [],
    filteredConductors = [],
  }: {
    filteredDrivers?: any[]
    filteredMatatus?: any[]
    filteredConductors?: any[]
  } = $props()

  let newDriverName = ""
  let newMatatuName = ""
  let newConductorName = ""

  // Remove functions
  function removeDriver(id: number | string) {
    favoriteDrivers.update((list) => list.filter((d) => d.id !== id))
  }

  function removeMatatu(id: number | string) {
    favoriteMatatus.update((list) => list.filter((m) => m.id !== id))
  }

  function removeConductor(id: number | string) {
    favoriteConductors.update((list) => list.filter((c) => c.id !== id))
  }

  // Tip modal control per item
  let selectedItem: any = null
  let showTipModal = false

  function openTipFor(item: any) {
    selectedItem = item
    showTipModal = true
  }

  function closeTip() {
    showTipModal = false
    selectedItem = null
  }

  function handleTip(driverAmount: number, conductorAmount: number) {
    console.log(
      `Tipped → Driver: ${driverAmount} KES, Conductor: ${conductorAmount} KES`,
    )
    // Here you would call real payment logic later
    closeTip()
  }

  // Add functions (unchanged)
  function handleAddDriver() {
    if (newDriverName.trim()) {
      addFavoriteDriver({
        id: Date.now(), // simple unique id
        name: newDriverName.trim(),
        vehicle: "Unknown",
        rating: 4.5,
      })
      newDriverName = ""
    }
  }

  function handleAddMatatu() {
    if (newMatatuName.trim()) {
      addFavoriteMatatu({
        id: Date.now(),
        name: newMatatuName.trim(),
        driver: "Unknown",
      })
      newMatatuName = ""
    }
  }

  function handleAddConductor() {
    if (newConductorName.trim()) {
      addFavoriteConductor({
        id: Date.now(),
        name: newConductorName.trim(),
        route: "Unknown",
        rating: 4.5,
      })
      newConductorName = ""
    }
  }
</script>

<div class="space-y-12">
  <!-- Drivers -->
  <section>
    <h3 class="text-xl font-semibold mb-4 text-base-content">
      Favorite Drivers
    </h3>

    {#if filteredDrivers.length === 0}
      <p class="text-center text-base-content/60 py-8">
        No favorite drivers yet
      </p>
    {:else}
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6"
      >
        {#each filteredDrivers as driver (driver.id)}
          <div
            class="card bg-base-100 shadow hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
            on:click={() => openTipFor(driver)}
          >
            <div class="card-body p-5">
              <div class="flex flex-col gap-1">
                <h4 class="font-bold text-lg group-hover:text-primary">
                  {driver.name}
                </h4>
                <p class="text-sm text-base-content/70">
                  {driver.vehicle || "Unknown vehicle"}
                </p>
              </div>
              <div class="badge badge-outline badge-lg absolute top-4 right-12">
                {driver.rating || "?"}★
              </div>
            </div>

            <!-- Remove heart -->
            <button
              class="btn btn-ghost btn-sm absolute top-3 right-3 opacity-70 hover:opacity-100 hover:text-error"
              on:click|stopPropagation={() => removeDriver(driver.id)}
              aria-label="Remove from favorites"
            >
              <Heart class="h-5 w-5 fill-current" />
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4">
      <input
        type="text"
        bind:value={newDriverName}
        placeholder="Add new driver..."
        class="input input-bordered w-full mb-3"
      />
      <button
        on:click={handleAddDriver}
        class="btn btn-primary w-full rounded-full py-6 text-lg"
        disabled={!newDriverName.trim()}
      >
        Favorite Driver
      </button>
    </div>
  </section>

  <!-- Matatus & Conductors sections follow the same pattern -->

  <!-- Matatus -->
  <section>
    <h3 class="text-xl font-semibold mb-4 text-base-content">
      Favorite Matatus
    </h3>

    {#if filteredMatatus.length === 0}
      <p class="text-center text-base-content/60 py-8">
        No favorite matatus yet
      </p>
    {:else}
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6"
      >
        {#each filteredMatatus as matatu (matatu.id)}
          <div
            class="card bg-base-100 shadow hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
            on:click={() => openTipFor(matatu)}
          >
            <div class="card-body p-5">
              <div class="flex flex-col gap-1">
                <h4 class="font-bold text-lg group-hover:text-primary">
                  {matatu.name}
                </h4>
                <p class="text-sm text-base-content/70">
                  Driver: {matatu.driver || "Unknown"}
                </p>
              </div>
            </div>

            <button
              class="btn btn-ghost btn-sm absolute top-3 right-3 opacity-70 hover:opacity-100 hover:text-error"
              on:click|stopPropagation={() => removeMatatu(matatu.id)}
              aria-label="Remove from favorites"
            >
              <Heart class="h-5 w-5 fill-current" />
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4">
      <input
        type="text"
        bind:value={newMatatuName}
        placeholder="Add new matatu..."
        class="input input-bordered w-full mb-3"
      />
      <button
        on:click={handleAddMatatu}
        class="btn btn-primary w-full rounded-full py-6 text-lg"
        disabled={!newMatatuName.trim()}
      >
        Favorite Matatu
      </button>
    </div>
  </section>

  <!-- Conductors -->
  <section>
    <h3 class="text-xl font-semibold mb-4 text-base-content">
      Favorite Conductors
    </h3>

    {#if filteredConductors.length === 0}
      <p class="text-center text-base-content/60 py-8">
        No favorite conductors yet
      </p>
    {:else}
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6"
      >
        {#each filteredConductors as conductor (conductor.id)}
          <div
            class="card bg-base-100 shadow hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
            on:click={() => openTipFor(conductor)}
          >
            <div class="card-body p-5">
              <div class="flex flex-col gap-1">
                <h4 class="font-bold text-lg group-hover:text-primary">
                  {conductor.name}
                </h4>
                <p class="text-sm text-base-content/70">
                  Route: {conductor.route || "Unknown"}
                </p>
              </div>
              <div class="badge badge-outline badge-lg absolute top-4 right-12">
                {conductor.rating || "?"}★
              </div>
            </div>

            <button
              class="btn btn-ghost btn-sm absolute top-3 right-3 opacity-70 hover:opacity-100 hover:text-error"
              on:click|stopPropagation={() => removeConductor(conductor.id)}
              aria-label="Remove from favorites"
            >
              <Heart class="h-5 w-5 fill-current" />
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="mt-4">
      <input
        type="text"
        bind:value={newConductorName}
        placeholder="Add new conductor..."
        class="input input-bordered w-full mb-3"
      />
      <button
        on:click={handleAddConductor}
        class="btn btn-primary w-full rounded-full py-6 text-lg"
        disabled={!newConductorName.trim()}
      >
        Favorite Conductor
      </button>
    </div>
  </section>
</div>

<!-- Global Tip Modal (shown when clicking any card) -->
{#if showTipModal && selectedItem}
  <TipCrew
    driverName={selectedItem.name || selectedItem.driverName || "Driver"}
    conductorName={selectedItem.conductorName || "Conductor"}
    onTip={handleTip}
  />
{/if}
