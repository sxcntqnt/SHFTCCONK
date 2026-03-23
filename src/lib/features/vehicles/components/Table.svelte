<script lang="ts">
  import type { Snippet } from "svelte"

  let {
    headers = [],
    children,
  }: {
    headers: string[]
    children?: Snippet
  } = $props()
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        {#each headers as h}
          <th>{h}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {@render children?.()}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  thead tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  th {
    padding: 10px 14px;
    text-align: left;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
  }
  :global(tbody tr) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    transition: background 0.12s;
  }
  :global(tbody tr:hover) {
    background: rgba(255, 255, 255, 0.03);
  }
  :global(tbody td) {
    padding: 12px 14px;
    color: var(--text-2);
    font-size: 0.875rem;
  }
</style>
