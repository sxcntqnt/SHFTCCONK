<script lang="ts">
  import { getOnboardingContext } from "../context"
  import type { RoleMeta } from "../types"
  import type { Role } from "$lib/features/auth/stores/roles"

  export let roleMeta: RoleMeta

  const context = getOnboardingContext()

  const isSelected = $derived(context.selectedRole === roleMeta.id)
  const isPro = $derived(context.isPro && roleMeta.id === context.selectedRole)

  function handleSelect() {
    context.selectedRole = roleMeta.id
    context.validationErr = null
  }
</script>

<button
  type="button"
  class="role-btn {isSelected ? 'selected' : ''}"
  style="--role-color: {roleMeta.color}"
  on:click={handleSelect}
  role="radio"
  aria-checked={isSelected}
>
  <div class="role-icon" style="color:{roleMeta.color}">
    {@html roleMeta.icon}
  </div>
  <div class="role-info">
    {#if isPro}
      <span class="verified-badge">Verified</span>
    {/if}
    <div class="role-name">{roleMeta.label}</div>
    <div class="role-desc">{roleMeta.description}</div>
  </div>
  <div class="role-check {isSelected ? 'checked' : ''}" aria-hidden="true">
    {#if isSelected}
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3.5"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    {/if}
  </div>
</button>
