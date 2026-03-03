<script lang="ts">
  interface Props {
    title: string
    children?: import("svelte").Snippet
    actions?: import("svelte").Snippet
  }
  let { title, children, actions }: Props = $props()
</script>

<div class="page-shell">
  <div class="page-head">
    <div>
      <div class="page-eyebrow">Fleet Management</div>
      <h1 class="page-title">{title}</h1>
    </div>
    {#if actions}
      <div class="page-actions">{@render actions()}</div>
    {/if}
  </div>
  <div class="page-body">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .page-shell {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100%;
  }

  .page-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }

  .page-eyebrow {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 6px;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2.2vw, 1.9rem);
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
  }

  .page-actions {
    flex-shrink: 0;
  }

  .page-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
