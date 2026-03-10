<!-- src/lib/components/RememberMatatu.svelte -->
<script lang="ts">
  import { Bookmark, X } from "@lucide/svelte"
  import {
    addRememberedMatatu,
    rememberedMatatus,
  } from "$lib/features/dashboard/stores/DashboardStore"

  let { remembered = [] }: { remembered?: any[] } = $props()

  let newMatatu = $state("")
  let inputFocused = $state(false)

  function handleAddMatatu() {
    if (newMatatu.trim()) {
      addRememberedMatatu({ name: newMatatu.trim() })
      newMatatu = ""
    }
  }

  function removeMatatu(index: number) {
    rememberedMatatus.update((list) => list.filter((_, i) => i !== index))
  }
</script>

<div class="rm-root">
  <!-- Header -->
  <div class="rm-header">
    <div class="rm-header-icon">
      <Bookmark size={18} strokeWidth={2.5} />
    </div>
    <div>
      <h3 class="rm-title">Remembered Matatus</h3>
      <p class="rm-subtitle">Quick access to your regular rides</p>
    </div>
  </div>

  <!-- List -->
  {#if remembered.length === 0}
    <div class="rm-empty">
      <span class="rm-empty-icon">🔖</span>
      <p class="rm-empty-text">No matatus saved yet</p>
    </div>
  {:else}
    <ul class="rm-list">
      {#each remembered as matatu, i}
        <li class="rm-item" style="animation-delay: {i * 40}ms">
          <div class="rm-item-icon">
            <Bookmark size={16} fill="currentColor" />
          </div>
          <span class="rm-item-name">{matatu.name}</span>
          <button
            class="rm-item-remove"
            onclick={() => removeMatatu(i)}
            aria-label="Remove {matatu.name}"
          >
            <X size={14} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Add input -->
  <div class="rm-add" class:rm-add-focused={inputFocused}>
    <div class="rm-add-icon">
      <Bookmark size={16} />
    </div>
    <input
      type="text"
      bind:value={newMatatu}
      placeholder="Remember a matatu…"
      class="rm-add-input"
      onfocus={() => (inputFocused = true)}
      onblur={() => (inputFocused = false)}
      onkeydown={(e) => e.key === "Enter" && handleAddMatatu()}
    />
    <button
      class="rm-add-btn"
      onclick={handleAddMatatu}
      disabled={!newMatatu.trim()}
    >
      Save
    </button>
  </div>
</div>

<style>
  .rm-root {
    background: rgba(202, 120, 88, 0.683);
    border: 1px solid oklch(0.93 0.005 260);
    border-radius: 20px;
    padding: 1.25rem;
    box-shadow: 0 1px 4px oklch(0.3 0.02 260 / 0.04);
  }

  .rm-header {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }
  .rm-header-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: oklch(0.62 0.18 250 / 0.08);
    color: oklch(0.55 0.18 250);
  }
  .rm-title {
    font-size: 1rem;
    font-weight: 700;
    color: oklch(0.2 0.02 260);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .rm-subtitle {
    font-size: 0.75rem;
    color: oklch(0.6 0.02 260);
    margin: 0.1rem 0 0;
  }

  .rm-empty {
    text-align: center;
    padding: 1.5rem 1rem;
  }
  .rm-empty-icon {
    font-size: 1.75rem;
    display: block;
    margin-bottom: 0.35rem;
  }
  .rm-empty-text {
    font-size: 0.85rem;
    color: oklch(0.6 0.02 260);
    margin: 0;
  }

  .rm-list {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .rm-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    background: oklch(0.98 0.002 260);
    border: 1px solid oklch(0.94 0.005 260);
    border-radius: 12px;
    animation: rm-item-in 0.3s ease-out both;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;
  }
  .rm-item:hover {
    border-color: oklch(0.88 0.01 260);
    background: oklch(0.97 0.003 260);
  }
  @keyframes rm-item-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .rm-item-icon {
    color: oklch(0.6 0.18 250);
    display: flex;
    flex-shrink: 0;
  }
  .rm-item-name {
    flex: 1;
    font-size: 0.88rem;
    font-weight: 550;
    color: oklch(0.25 0.02 260);
  }
  .rm-item-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: none;
    background: none;
    color: oklch(0.7 0.01 260);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .rm-item-remove:hover {
    background: oklch(0.65 0.2 15 / 0.08);
    color: oklch(0.6 0.2 15);
  }

  .rm-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    border: 1.5px solid oklch(0.92 0.005 260);
    border-radius: 14px;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .rm-add-focused {
    border-color: oklch(0.6 0.18 250);
    box-shadow: 0 0 0 3px oklch(0.6 0.18 250 / 0.06);
  }
  .rm-add-icon {
    color: oklch(0.7 0.01 260);
    display: flex;
    flex-shrink: 0;
  }
  .rm-add-input {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    font-size: 0.88rem;
    color: oklch(0.2 0.02 260);
    font-family: inherit;
  }
  .rm-add-input::placeholder {
    color: oklch(0.72 0.01 260);
  }
  .rm-add-btn {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 650;
    font-family: inherit;
    color: white;
    background: linear-gradient(
      135deg,
      oklch(0.6 0.18 250),
      oklch(0.52 0.2 260)
    );
    cursor: pointer;
    white-space: nowrap;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease,
      opacity 0.15s ease;
  }
  .rm-add-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 3px 12px oklch(0.52 0.2 260 / 0.25);
  }
  .rm-add-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
</style>
