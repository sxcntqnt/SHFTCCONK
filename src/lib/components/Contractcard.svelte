<!-- src/lib/components/ContractCard.svelte -->
<script lang="ts">
  interface Props {
    contract?: {
      id?: string
      title?: string
      status?: string
      counterparty?: string
      value?: string
      expiresAt?: string
    }
  }
  let { contract = {} }: Props = $props()
</script>

<style>
  .contract-card {
    background: var(--surface, #1a1a24);
    border: 1px solid var(--rim, rgba(255,255,255,0.08));
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .contract-card:hover {
    border-color: rgba(242,101,34,0.3);
    transform: translateY(-2px);
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .card-title {
    font-family: var(--font-display, 'Syne', sans-serif);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-1, #fff);
  }

  .status-pill {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
    flex-shrink: 0;
  }
  .status-pill.active  { background: rgba(0,176,155,0.12); color: #00b09b; border: 1px solid rgba(0,176,155,0.25); }
  .status-pill.pending { background: rgba(250,204,21,0.10); color: #facc15; border: 1px solid rgba(250,204,21,0.22); }
  .status-pill.expired { background: rgba(248,113,113,0.10); color: #f87171; border: 1px solid rgba(248,113,113,0.22); }
  .status-pill.default { background: rgba(255,255,255,0.06); color: #9ca3af; border: 1px solid rgba(255,255,255,0.1); }

  .card-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-3, rgba(255,255,255,0.35));
  }
  .meta-value {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-1, #fff);
  }
</style>

<div class="contract-card">
  <div class="card-head">
    <span class="card-title">{contract.title ?? 'Untitled Contract'}</span>
    <span class="status-pill {contract.status?.toLowerCase() ?? 'default'}">
      {contract.status ?? 'Unknown'}
    </span>
  </div>

  <div class="card-meta">
    {#if contract.counterparty}
      <div class="meta-item">
        <span class="meta-label">Party</span>
        <span class="meta-value">{contract.counterparty}</span>
      </div>
    {/if}
    {#if contract.value}
      <div class="meta-item">
        <span class="meta-label">Value</span>
        <span class="meta-value">{contract.value}</span>
      </div>
    {/if}
    {#if contract.expiresAt}
      <div class="meta-item">
        <span class="meta-label">Expires</span>
        <span class="meta-value">{contract.expiresAt}</span>
      </div>
    {/if}
    {#if contract.id}
      <div class="meta-item">
        <span class="meta-label">ID</span>
        <span class="meta-value" style="font-family: monospace; font-size: 0.72rem;">{contract.id}</span>
      </div>
    {/if}
  </div>
</div>