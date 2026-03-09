<!-- src/lib/components/SearchBar.svelte -->
<script lang="ts">
  import { Search, X } from "@lucide/svelte"
  import { searchQuery } from "$lib/features/dashboard/stores/DashboardStore.ts"

  let focused = $state(false)
</script>

<div
  class="sb-wrap"
  class:sb-focused={focused}
  class:sb-has-value={!!$searchQuery}
>
  <div class="sb-icon-left">
    <Search size={20} strokeWidth={2.2} />
  </div>

  <input
    type="text"
    bind:value={$searchQuery}
    placeholder="Search drivers, conductors, matatus…"
    class="sb-input"
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  />

  {#if $searchQuery}
    <button
      class="sb-clear"
      onclick={() => searchQuery.set("")}
      aria-label="Clear search"
    >
      <X size={16} strokeWidth={2.5} />
    </button>
  {/if}
</div>

<style>
  .sb-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 1rem;
    padding: 0 1rem;
    height: 52px;
    background: oklch(0.97 0.003 260);
    border: 1.5px solid oklch(0.92 0.005 260);
    border-radius: 16px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .sb-focused {
    border-color: oklch(0.6 0.18 250);
    box-shadow:
      0 0 0 4px oklch(0.6 0.18 250 / 0.06),
      0 2px 8px oklch(0.3 0.02 260 / 0.04);
    background: white;
  }

  .sb-has-value {
    background: white;
  }

  .sb-icon-left {
    display: flex;
    align-items: center;
    color: oklch(0.65 0.02 260);
    flex-shrink: 0;
    transition: color 0.2s ease;
  }
  .sb-focused .sb-icon-left {
    color: oklch(0.55 0.18 250);
  }

  .sb-input {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    font-size: 0.95rem;
    font-weight: 450;
    color: oklch(0.18 0.02 260);
    font-family: inherit;
    height: 100%;
    min-width: 0;
  }
  .sb-input::placeholder {
    color: oklch(0.68 0.01 260);
    font-weight: 400;
  }

  .sb-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: none;
    background: oklch(0.94 0.005 260);
    color: oklch(0.5 0.02 260);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
    animation: sb-clear-in 0.15s ease-out;
  }
  .sb-clear:hover {
    background: oklch(0.9 0.01 260);
    color: oklch(0.35 0.02 260);
  }
  .sb-clear:active {
    transform: scale(0.9);
  }

  @keyframes sb-clear-in {
    from {
      opacity: 0;
      transform: scale(0.7);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
