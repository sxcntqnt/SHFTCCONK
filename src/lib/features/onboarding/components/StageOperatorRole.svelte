<script lang="ts">
  import type { RoleComponentProps } from "../types"

  export let props: RoleComponentProps
</script>

<button
  type="button"
  class="role-btn {props.isSelected ? 'selected' : ''}"
  style="--role-color: {props.color}"
  on:click={props.onSelect}
  role="radio"
  aria-checked={props.isSelected}
>
  <div class="role-icon" style="color:{props.color}">
    {@html props.icon}
  </div>
  <div class="role-info">
    <span class="verified-badge">Verified</span>
    <div class="role-name">{props.label}</div>
    <div class="role-desc">{props.description}</div>
  </div>
  <div
    class="role-check {props.isSelected ? 'checked' : ''}"
    aria-hidden="true"
  >
    {#if props.isSelected}
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
