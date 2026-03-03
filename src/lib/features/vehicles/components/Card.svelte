<script lang="ts">
  interface Props {
    children?: import("svelte").Snippet
    padding?: string // e.g. "tight" | "normal" (default)
  }
  let { children, padding = "normal" }: Props = $props()
</script>

<div class="vm-card">
  <div class="vm-card-inner {padding === 'tight' ? 'tight' : ''}">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .vm-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.25s;
  }
  .vm-card:hover {
    border-color: rgba(242, 101, 34, 0.18);
  }

  /* Subtle top accent */
  .vm-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
    pointer-events: none;
  }

  .vm-card-inner {
    padding: 20px 22px;
  }
  .vm-card-inner.tight {
    padding: 14px 16px;
  }
</style>
