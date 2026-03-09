<!-- src/lib/components/Favorites.svelte -->
<script lang="ts">
  import { Heart, Car, User, CreditCard } from "@lucide/svelte"
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

  let newDriverName = $state("")
  let newMatatuName = $state("")
  let newConductorName = $state("")

  let activeTab: "drivers" | "matatus" | "conductors" = $state("drivers")

  function removeDriver(id: number | string) {
    favoriteDrivers.update((list) => list.filter((d) => d.id !== id))
  }
  function removeMatatu(id: number | string) {
    favoriteMatatus.update((list) => list.filter((m) => m.id !== id))
  }
  function removeConductor(id: number | string) {
    favoriteConductors.update((list) => list.filter((c) => c.id !== id))
  }

  let selectedItem: any = $state(null)
  let showTipModal = $state(false)

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
    closeTip()
  }

  function handleAddDriver() {
    if (newDriverName.trim()) {
      addFavoriteDriver({
        id: Date.now(),
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

  function handleKeydown(e: KeyboardEvent, handler: () => void) {
    if (e.key === "Enter") handler()
  }
</script>

<div class="fav-root">
  <!-- Header -->
  <div class="fav-header">
    <div class="fav-header-left">
      <div class="fav-icon-badge">
        <Heart size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h2 class="fav-title">Favorites</h2>
        <p class="fav-subtitle">Your preferred crew and vehicles</p>
      </div>
    </div>
    <div class="fav-header-counts">
      <span class="fav-count-chip">{filteredDrivers.length} drivers</span>
      <span class="fav-count-chip">{filteredMatatus.length} matatus</span>
      <span class="fav-count-chip">{filteredConductors.length} conductors</span>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="fav-tabs">
    <button
      class="fav-tab"
      class:fav-tab-active={activeTab === "drivers"}
      onclick={() => (activeTab = "drivers")}
    >
      <User size={16} strokeWidth={2} />
      <span class="fav-tab-text">Drivers</span>
      {#if filteredDrivers.length > 0}<span class="fav-tab-badge"
          >{filteredDrivers.length}</span
        >{/if}
    </button>
    <button
      class="fav-tab"
      class:fav-tab-active={activeTab === "matatus"}
      onclick={() => (activeTab = "matatus")}
    >
      <Car size={16} strokeWidth={2} />
      <span class="fav-tab-text">Matatus</span>
      {#if filteredMatatus.length > 0}<span class="fav-tab-badge"
          >{filteredMatatus.length}</span
        >{/if}
    </button>
    <button
      class="fav-tab"
      class:fav-tab-active={activeTab === "conductors"}
      onclick={() => (activeTab = "conductors")}
    >
      <CreditCard size={16} strokeWidth={2} />
      <span class="fav-tab-text">Conductors</span>
      {#if filteredConductors.length > 0}<span class="fav-tab-badge"
          >{filteredConductors.length}</span
        >{/if}
    </button>
  </div>

  <!-- ═══ DRIVERS ═══ -->
  {#if activeTab === "drivers"}
    <div class="fav-section fav-slide-in">
      {#if filteredDrivers.length === 0}
        <div class="fav-empty">
          <User size={32} strokeWidth={1.5} />
          <p>No favorite drivers yet</p>
        </div>
      {:else}
        <div class="fav-grid">
          {#each filteredDrivers as driver, i (driver.id)}
            <button
              class="fav-card"
              style="animation-delay: {i * 50}ms"
              onclick={() => openTipFor(driver)}
            >
              <div class="fav-card-top">
                <div class="fav-card-avatar">
                  {driver.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span
                  class="fav-card-heart"
                  role="button"
                  tabindex="0"
                  aria-label="Remove favorite driver"
                  onclick={(e) => {
                    e.stopPropagation() // still prevents card click
                    removeDriver(driver.id)
                  }}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      removeDriver(driver.id)
                    }
                  }}
                >
                  <Heart size={14} fill="currentColor" strokeWidth={0} />
                </span>
              </div>
              <h4 class="fav-card-name">{driver.name}</h4>
              <p class="fav-card-detail">
                {driver.vehicle || "Unknown vehicle"}
              </p>
              {#if driver.rating}
                <div class="fav-card-rating">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    ><polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    /></svg
                  >
                  <span>{driver.rating}</span>
                </div>
              {/if}
              <div class="fav-card-tap-hint">
                <CreditCard size={12} strokeWidth={2} /><span>Tap to tip</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      <div class="fav-add-row">
        <input
          type="text"
          bind:value={newDriverName}
          placeholder="Add new driver…"
          class="fav-add-input"
          onkeydown={(e) => handleKeydown(e, handleAddDriver)}
        />
        <button
          class="fav-add-btn fav-add-btn-rose"
          onclick={handleAddDriver}
          disabled={!newDriverName.trim()}
        >
          <Heart size={16} strokeWidth={2.5} />Favorite
        </button>
      </div>
    </div>
  {/if}

  <!-- ═══ MATATUS ═══ -->
  {#if activeTab === "matatus"}
    <div class="fav-section fav-slide-in">
      {#if filteredMatatus.length === 0}
        <div class="fav-empty">
          <Car size={32} strokeWidth={1.5} />
          <p>No favorite matatus yet</p>
        </div>
      {:else}
        <div class="fav-grid">
          {#each filteredMatatus as matatu, i (matatu.id)}
            <button
              class="fav-card"
              style="animation-delay: {i * 50}ms"
              onclick={() => openTipFor(matatu)}
            >
              <div class="fav-card-top">
                <div class="fav-card-avatar fav-avatar-teal">
                  {matatu.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span
                  class="fav-card-heart"
                  role="button"
                  tabindex="0"
                  aria-label="Remove favorite matatu"
                  onclick={(e) => {
                    e.stopPropagation()
                    removeMatatu(matatu.id)
                  }}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      removeMatatu(matatu.id)
                    }
                  }}
                >
                  <Heart size={14} fill="currentColor" strokeWidth={0} />
                </span>
              </div>
              <h4 class="fav-card-name">{matatu.name}</h4>
              <p class="fav-card-detail">
                Driver: {matatu.driver || "Unknown"}
              </p>
              <div class="fav-card-tap-hint">
                <CreditCard size={12} strokeWidth={2} /><span>Tap to tip</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      <div class="fav-add-row">
        <input
          type="text"
          bind:value={newMatatuName}
          placeholder="Add new matatu…"
          class="fav-add-input"
          onkeydown={(e) => handleKeydown(e, handleAddMatatu)}
        />
        <button
          class="fav-add-btn fav-add-btn-teal"
          onclick={handleAddMatatu}
          disabled={!newMatatuName.trim()}
        >
          <Heart size={16} strokeWidth={2.5} />Favorite
        </button>
      </div>
    </div>
  {/if}

  <!-- ═══ CONDUCTORS ═══ -->
  {#if activeTab === "conductors"}
    <div class="fav-section fav-slide-in">
      {#if filteredConductors.length === 0}
        <div class="fav-empty">
          <CreditCard size={32} strokeWidth={1.5} />
          <p>No favorite conductors yet</p>
        </div>
      {:else}
        <div class="fav-grid">
          {#each filteredConductors as conductor, i (conductor.id)}
            <button
              class="fav-card"
              style="animation-delay: {i * 50}ms"
              onclick={() => openTipFor(conductor)}
            >
              <div class="fav-card-top">
                <div class="fav-card-avatar fav-avatar-amber">
                  {conductor.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span
                  class="fav-card-heart"
                  role="button"
                  tabindex="0"
                  aria-label="Remove favorite conductor"
                  onclick={(e) => {
                    e.stopPropagation()
                    removeConductor(conductor.id)
                  }}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      removeConductor(conductor.id)
                    }
                  }}
                >
                  <Heart size={14} fill="currentColor" strokeWidth={0} />
                </span>
              </div>
              <h4 class="fav-card-name">{conductor.name}</h4>
              <p class="fav-card-detail">
                Route: {conductor.route || "Unknown"}
              </p>
              {#if conductor.rating}
                <div class="fav-card-rating">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    ><polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    /></svg
                  >
                  <span>{conductor.rating}</span>
                </div>
              {/if}
              <div class="fav-card-tap-hint">
                <CreditCard size={12} strokeWidth={2} /><span>Tap to tip</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
      <div class="fav-add-row">
        <input
          type="text"
          bind:value={newConductorName}
          placeholder="Add new conductor…"
          class="fav-add-input"
          onkeydown={(e) => handleKeydown(e, handleAddConductor)}
        />
        <button
          class="fav-add-btn fav-add-btn-amber"
          onclick={handleAddConductor}
          disabled={!newConductorName.trim()}
        >
          <Heart size={16} strokeWidth={2.5} />Favorite
        </button>
      </div>
    </div>
  {/if}
</div>

{#if showTipModal && selectedItem}
  <TipCrew
    driverName={selectedItem.name || selectedItem.driverName || "Driver"}
    conductorName={selectedItem.conductorName || "Conductor"}
    onTip={handleTip}
    onClose={closeTip}
  />
{/if}

<style>
  .fav-root {
    font-family: "DM Sans", system-ui, sans-serif;
  }

  /* ── Header ── */
  .fav-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .fav-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .fav-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(244, 63, 94, 0.15),
      rgba(244, 63, 94, 0.05)
    );
    border: 1px solid rgba(244, 63, 94, 0.2);
    color: #fb7185;
    flex-shrink: 0;
  }
  .fav-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #f0f1f4;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .fav-subtitle {
    font-size: 0.82rem;
    color: #6b7084;
    margin: 0.15rem 0 0;
  }
  .fav-header-counts {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .fav-count-chip {
    font-size: 0.7rem;
    font-weight: 500;
    color: #6b7084;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.2rem 0.55rem;
    border-radius: 100px;
  }

  /* ── Tabs ── */
  .fav-tabs {
    display: flex;
    gap: 0.35rem;
    padding: 0.3rem;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    margin-bottom: 1.5rem;
  }
  .fav-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 0.5rem;
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    color: #6b7084;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .fav-tab:hover {
    color: #c8cbd3;
    background: rgba(255, 255, 255, 0.03);
  }
  .fav-tab-active {
    color: #f0f1f4 !important;
    background: rgba(255, 255, 255, 0.06) !important;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .fav-tab-badge {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(244, 63, 94, 0.15);
    color: #fb7185;
    padding: 0.1rem 0.4rem;
    border-radius: 100px;
    min-width: 18px;
    text-align: center;
  }

  /* ── Section / empty ── */
  .fav-section {
    min-height: 120px;
  }
  .fav-slide-in {
    animation: fav-slide 0.25s ease-out;
  }
  @keyframes fav-slide {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .fav-empty {
    text-align: center;
    padding: 3rem 2rem;
    color: #44475a;
  }
  .fav-empty p {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
    color: #555a6e;
  }

  /* ── Card grid ── */
  .fav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .fav-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    cursor: pointer;
    font-family: "DM Sans", system-ui, sans-serif;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.15s ease;
    animation: fav-card-in 0.35s ease-out both;
  }
  .fav-card:hover {
    border-color: rgba(244, 63, 94, 0.15);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }
  @keyframes fav-card-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fav-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .fav-card-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    font-weight: 700;
    color: #fb7185;
    background: linear-gradient(
      135deg,
      rgba(244, 63, 94, 0.12),
      rgba(244, 63, 94, 0.04)
    );
    border: 1px solid rgba(244, 63, 94, 0.15);
  }
  .fav-avatar-teal {
    color: #5eead4;
    background: linear-gradient(
      135deg,
      rgba(94, 234, 212, 0.12),
      rgba(94, 234, 212, 0.04)
    );
    border-color: rgba(94, 234, 212, 0.15);
  }
  .fav-avatar-amber {
    color: #fbbf24;
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.12),
      rgba(251, 191, 36, 0.04)
    );
    border-color: rgba(251, 191, 36, 0.15);
  }

  .fav-card-heart {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(244, 63, 94, 0.4);
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .fav-card-heart:hover {
    color: #fb7185;
    background: rgba(244, 63, 94, 0.1);
  }

  .fav-card-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0f1f4;
    margin: 0 0 0.2rem;
    line-height: 1.3;
  }
  .fav-card-detail {
    font-size: 0.75rem;
    color: #6b7084;
    margin: 0 0 0.4rem;
  }

  .fav-card-rating {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.08);
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    margin-bottom: 0.4rem;
  }

  .fav-card-tap-hint {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: auto;
    padding-top: 0.5rem;
    font-size: 0.68rem;
    color: #44475a;
    transition: color 0.15s ease;
  }
  .fav-card:hover .fav-card-tap-hint {
    color: #34d399;
  }

  /* ── Add row ── */
  .fav-add-row {
    display: flex;
    gap: 0.5rem;
    padding: 0.4rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    transition: border-color 0.2s ease;
  }
  .fav-add-row:focus-within {
    border-color: rgba(244, 63, 94, 0.2);
  }

  .fav-add-input {
    flex: 1;
    padding: 0.55rem 0.7rem;
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 0.85rem;
    color: #e2e4e9;
    background: transparent;
    border: none;
    outline: none;
  }
  .fav-add-input::placeholder {
    color: rgba(255, 255, 255, 0.18);
  }

  .fav-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    flex-shrink: 0;
    color: #0c0e13;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }
  .fav-add-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .fav-add-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .fav-add-btn-rose {
    background: linear-gradient(135deg, #fb7185, #f43f5e);
  }
  .fav-add-btn-rose:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(244, 63, 94, 0.3);
  }
  .fav-add-btn-teal {
    background: linear-gradient(135deg, #5eead4, #2dd4bf);
  }
  .fav-add-btn-teal:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(45, 212, 191, 0.3);
  }
  .fav-add-btn-amber {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
  }
  .fav-add-btn-amber:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
  }

  @media (max-width: 480px) {
    .fav-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .fav-header {
      flex-direction: column;
      gap: 0.5rem;
    }
    .fav-tab-text {
      display: none;
    }
  }
</style>
