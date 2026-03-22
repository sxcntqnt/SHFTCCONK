<!-- src/lib/features/finance/WalletView.svelte -->
<!--
  Shared wallet UI — used by all 5 wallet pages.
  Each page passes its own config, summary, and transactions.
  The accent color and available actions differ per role.
-->
<script lang="ts">
  import { enhance } from "$app/forms"
  import type {
    WalletConfig,
    WalletSummary,
    WalletTransaction,
  } from "$lib/features/wallet/wallet.types"
  import { TX_LABELS, fmtKes, fmtDate } from "$lib/features/wallet/wallet.types"

  interface Props {
    config: WalletConfig
    summary: WalletSummary
    transactions: WalletTransaction[]
    formResult?: { success?: boolean; error?: string; message?: string } | null
    // Slot-like props for role-specific content
    kpis?: { label: string; value: string; sub?: string }[]
    orgBreakdown?: {
      orgId: string
      orgName: string
      earnedKes: number
      txCount: number
    }[]
    mpesaPhone?: string | null
    // Settle form extras
    showSettleTab?: boolean
  }

  let {
    config,
    summary,
    transactions,
    formResult = null,
    kpis = [],
    orgBreakdown = [],
    mpesaPhone = null,
    showSettleTab = false,
  }: Props = $props()

  const accent = config.accentColor
  const accentRgb = config.accentRgb

  // ── Modal state ───────────────────────────────────────────────────────────
  let modalMode = $state<"withdraw" | "topup" | "settle" | null>(null)
  let submitting = $state(false)
  let amount = $state("")
  let phone = $state(mpesaPhone ?? "")
  let shortcode = $state("")
  let reference = $state("")

  // ── Filter ────────────────────────────────────────────────────────────────
  let filter = $state<"all" | "in" | "out">("all")

  let filtered = $derived(
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.direction === filter),
  )

  const STATUS_COLOR: Record<string, string> = {
    completed: accent,
    pending: "#facc15",
    processing: "#facc15",
    failed: "#f87171",
  }

  $effect(() => {
    if (formResult?.success) {
      modalMode = null
      submitting = false
    }
  })

  function openModal(mode: typeof modalMode) {
    amount = ""
    phone = mpesaPhone ?? ""
    shortcode = ""
    reference = ""
    modalMode = mode
  }
</script>

<!-- ── Modal ─────────────────────────────────────────────────────────────── -->
{#if modalMode}
  <div class="backdrop" onclick={() => (modalMode = null)}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-hd">
        <div>
          <div class="modal-ey" style="color:{accent}">
            {modalMode === "topup"
              ? "M-Pesa"
              : modalMode === "settle"
                ? "B2B Settlement"
                : "M-Pesa"}
          </div>
          <div class="modal-ti">
            {modalMode === "topup"
              ? "Top Up Wallet"
              : modalMode === "settle"
                ? "Settle to Paybill"
                : config.withdrawLabel}
          </div>
        </div>
        <button class="x-btn" onclick={() => (modalMode = null)}>✕</button>
      </div>

      <form
        method="POST"
        action={modalMode === "topup"
          ? "?/topup"
          : modalMode === "settle"
            ? "?/settle"
            : "?/withdraw"}
        use:enhance={() => {
          submitting = true
          return async ({ update }) => {
            await update()
            submitting = false
          }
        }}
      >
        <div class="modal-body">
          <!-- Balance hint -->
          <div
            class="balance-hint"
            style="border-color:rgba({accentRgb},0.18); background:rgba({accentRgb},0.07)"
          >
            <span class="hint-lbl" style="color:{accent}">
              {modalMode === "topup" ? "Current Balance" : "Available"}
            </span>
            <span class="hint-val">{fmtKes(summary.availableKes)}</span>
          </div>

          <!-- Amount -->
          <div class="mfield">
            <label class="mlabel" for="m-amount">Amount (KES)</label>
            <input
              id="m-amount"
              name="amount"
              type="number"
              placeholder="e.g. 500"
              class="minput"
              bind:value={amount}
              min="10"
              required
            />
          </div>

          <!-- Phone (withdraw / topup) -->
          {#if modalMode !== "settle"}
            <div class="mfield">
              <label class="mlabel" for="m-phone">M-Pesa Phone</label>
              <div class="phone-row">
                <span class="phone-pfx" style="color:{accent}">+254</span>
                <input
                  id="m-phone"
                  name="phone"
                  type="tel"
                  placeholder="712 345 678"
                  class="minput phone-in"
                  bind:value={phone}
                  required
                />
              </div>
            </div>
          {/if}

          <!-- Shortcode + reference (settle) -->
          {#if modalMode === "settle"}
            <div class="mfield">
              <label class="mlabel" for="m-sc">Paybill / Till Number</label>
              <input
                id="m-sc"
                name="shortcode"
                type="text"
                placeholder="e.g. 522533"
                class="minput"
                bind:value={shortcode}
                maxlength="6"
                required
              />
            </div>
            <div class="mfield">
              <label class="mlabel" for="m-ref"
                >Reference <span class="opt">optional</span></label
              >
              <input
                id="m-ref"
                name="reference"
                type="text"
                placeholder="e.g. Invoice #1042"
                class="minput"
                bind:value={reference}
              />
            </div>
          {/if}

          <!-- Quick amounts -->
          {#if modalMode !== "settle"}
            <div class="quick-row">
              {#each modalMode === "topup" ? [100, 500, 1000, 5000] : [100, 500, 1000, 2000] as q}
                <button
                  type="button"
                  class="quick-btn {amount === String(q) ? 'sel' : ''}"
                  style={amount === String(q)
                    ? `border-color:rgba(${accentRgb},0.3); color:${accent}; background:rgba(${accentRgb},0.08)`
                    : ""}
                  onclick={() => (amount = String(q))}
                  >{q.toLocaleString()}</button
                >
              {/each}
            </div>
          {/if}

          {#if formResult?.error}
            <div class="m-err">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" /><line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {formResult.error}
            </div>
          {/if}
        </div>

        <div class="modal-ft">
          <button
            type="button"
            class="btn-cancel"
            onclick={() => (modalMode = null)}>Cancel</button
          >
          <button
            type="submit"
            class="btn-action"
            disabled={submitting || !amount}
            style="background:{accent}; box-shadow:0 4px 18px rgba({accentRgb},0.28)"
          >
            {#if submitting}
              <span class="spin"></span>Sending…
            {:else}
              {modalMode === "topup"
                ? "Send M-Pesa Request"
                : modalMode === "settle"
                  ? "Initiate Settlement"
                  : "Send to M-Pesa"}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Page ───────────────────────────────────────────────────────────────── -->
<div class="content">
  <!-- Success banner -->
  {#if formResult?.success && formResult.message}
    <div
      class="banner"
      style="border-color:rgba({accentRgb},0.25); background:rgba({accentRgb},0.08)"
    >
      <div
        class="banner-icon"
        style="color:{accent}; background:rgba({accentRgb},0.12)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <div class="banner-ti">
          {formResult.success && formResult.message.includes("phone")
            ? "Check your phone"
            : "Done"}
        </div>
        <div class="banner-sub">{formResult.message}</div>
      </div>
    </div>
  {/if}

  <!-- Header -->
  <div class="page-hd">
    <div class="eyebrow" style="color:{accent}">
      <span
        class="live-dot"
        style="background:{accent}; box-shadow:0 0 0 0 rgba({accentRgb},0.5)"
      ></span>
      {config.role.toUpperCase()} · WALLET
    </div>
    <h1 class="page-title">{config.title}</h1>
    <p class="page-sub">{config.subtitle}</p>
  </div>

  <!-- Balance hero -->
  <div
    class="hero"
    style="border-color:rgba({accentRgb},0.25); background:linear-gradient(145deg, rgba({accentRgb},0.12), rgba({accentRgb},0.03) 60%)"
  >
    <div
      class="hero-glow"
      style="background:radial-gradient(circle, rgba({accentRgb},0.14), transparent 65%)"
    ></div>

    <div class="hero-left">
      <div class="hero-lbl" style="color:{accent}">Available Balance</div>
      <div class="hero-amt">
        <span class="hero-cur" style="color:{accent}">KES</span>
        <span class="hero-val"
          >{Math.max(0, summary.availableKes).toLocaleString("en-KE")}</span
        >
      </div>
      {#if summary.pendingKes > 0}
        <div class="hero-pending">
          <span class="p-dot"></span>
          {fmtKes(summary.pendingKes)} pending
        </div>
      {/if}
    </div>

    <div class="hero-stats">
      <div class="hstat">
        <div class="hstat-v">{fmtKes(summary.totalEarnedKes)}</div>
        <div class="hstat-l">Total In</div>
      </div>
      <div class="hstat-sep"></div>
      <div class="hstat">
        <div class="hstat-v">{fmtKes(summary.totalSpentKes)}</div>
        <div class="hstat-l">Total Out</div>
      </div>
    </div>

    <div class="hero-actions">
      {#if config.canWithdraw}
        <button
          class="act-btn primary"
          style="background:{accent}; box-shadow:0 4px 18px rgba({accentRgb},0.3)"
          onclick={() => openModal("withdraw")}
          disabled={summary.availableKes < 10}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" /><polyline
              points="19 12 12 19 5 12"
            />
          </svg>
          Withdraw
        </button>
      {/if}
      {#if config.canTopUp}
        <button
          class="act-btn primary"
          style="background:{accent}; box-shadow:0 4px 18px rgba({accentRgb},0.3)"
          onclick={() => openModal("topup")}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="12" y1="19" x2="12" y2="5" /><polyline
              points="5 12 12 5 19 12"
            />
          </svg>
          Top Up
        </button>
      {/if}
      {#if config.canSettle}
        <button class="act-btn secondary" onclick={() => openModal("settle")}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
            />
          </svg>
          B2B Settle
        </button>
      {/if}
    </div>
  </div>

  <!-- KPIs -->
  {#if kpis.length > 0}
    <div
      class="kpi-strip"
      style="grid-template-columns:repeat({Math.min(kpis.length, 4)}, 1fr)"
    >
      {#each kpis as kpi}
        <div class="kpi">
          <div class="kpi-v">{kpi.value}</div>
          <div class="kpi-l">{kpi.label}</div>
          {#if kpi.sub}<div class="kpi-s">{kpi.sub}</div>{/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Org breakdown (operator only) -->
  {#if orgBreakdown.length > 1}
    <div class="org-strip">
      {#each orgBreakdown as org}
        <div class="org-card" style="border-color:rgba({accentRgb},0.15)">
          <div class="org-name">{org.orgName}</div>
          <div class="org-earn" style="color:{accent}">
            {fmtKes(org.earnedKes)}
          </div>
          <div class="org-tx">{org.txCount} transactions</div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Transactions -->
  <div class="tx-card">
    <div class="tx-hd">
      <div>
        <div class="card-ey">History</div>
        <div class="card-ti">Transactions</div>
      </div>
      <div class="filters">
        {#each [["all", "All"], ["in", "Inflows"], ["out", "Outflows"]] as [k, l]}
          <button
            class="fchip {filter === k ? 'act' : ''}"
            style={filter === k
              ? `border-color:rgba(${accentRgb},0.25); color:${accent}; background:rgba(${accentRgb},0.08)`
              : ""}
            onclick={() => (filter = k as typeof filter)}>{l}</button
          >
        {/each}
      </div>
    </div>

    {#if filtered.length === 0}
      <div class="empty">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          opacity="0.2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" /><line
            x1="8"
            y1="21"
            x2="16"
            y2="21"
          />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <div class="empty-ti">No transactions yet</div>
        <div class="empty-sub">Activity will appear here.</div>
      </div>
    {:else}
      <div class="tx-list">
        {#each filtered as tx}
          {@const isIn = tx.direction === "in"}
          <div class="tx-row">
            <div
              class="tx-ic"
              style="color:{isIn ? accent : '#f87171'}; background:{isIn
                ? `rgba(${accentRgb},0.1)`
                : 'rgba(248,113,113,0.1)'}; border-color:{isIn
                ? `rgba(${accentRgb},0.22)`
                : 'rgba(248,113,113,0.22)'}"
            >
              {#if isIn}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline
                    points="5 12 12 5 19 12"
                  />
                </svg>
              {:else}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" /><polyline
                    points="19 12 12 19 5 12"
                  />
                </svg>
              {/if}
            </div>
            <div class="tx-info">
              <div class="tx-desc">{tx.description}</div>
              <div class="tx-meta">
                {fmtDate(tx.createdAt)}
                {#if tx.counterpart}
                  · {tx.counterpart}{/if}
                {#if tx.mpesaRef}
                  · <span class="mono">{tx.mpesaRef}</span>{/if}
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amt" style="color:{isIn ? accent : '#f87171'}">
                {isIn ? "+" : "−"}{fmtKes(tx.amountKes)}
              </div>
              <div
                class="tx-st"
                style="color:{STATUS_COLOR[tx.status] ?? 'var(--text-3)'}"
              >
                {tx.status}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .content {
    flex: 1;
    padding: 36px 40px;
    font-family: var(--font-body);
  }

  /* Banner */
  .banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    border: 1px solid;
    border-radius: 13px;
    margin-bottom: 26px;
  }
  .banner-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .banner-ti {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .banner-sub {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 1px;
  }

  /* Header */
  .page-hd {
    margin-bottom: 26px;
  }
  .eyebrow {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: pulse 2s ease-out infinite;
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 currentColor;
    }
    70% {
      box-shadow: 0 0 0 6px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2.2vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .page-sub {
    font-size: 0.85rem;
    color: var(--text-3);
  }

  /* Hero */
  .hero {
    border: 1px solid;
    border-radius: 22px;
    padding: 28px 30px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 22px;
    position: relative;
    overflow: hidden;
  }
  .hero-glow {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 220px;
    height: 220px;
    pointer-events: none;
  }
  .hero-left {
    flex: 1;
    min-width: 0;
  }
  .hero-lbl {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .hero-amt {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .hero-cur {
    font-size: 1rem;
    font-weight: 700;
    align-self: flex-start;
    margin-top: 7px;
  }
  .hero-val {
    font-family: var(--font-display);
    font-size: 2.8rem;
    font-weight: 900;
    letter-spacing: -0.07em;
    line-height: 1;
    color: var(--text-1);
  }
  .hero-pending {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 7px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #facc15;
    background: rgba(250, 204, 21, 0.1);
    border: 1px solid rgba(250, 204, 21, 0.2);
    padding: 3px 9px;
    border-radius: 100px;
  }
  .p-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #facc15;
  }

  .hero-stats {
    display: flex;
    gap: 18px;
    align-items: center;
  }
  .hstat {
    text-align: right;
  }
  .hstat-v {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1;
  }
  .hstat-l {
    font-size: 0.58rem;
    color: var(--text-3);
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }
  .hstat-sep {
    width: 1px;
    background: rgba(255, 255, 255, 0.1);
    align-self: stretch;
  }

  .hero-actions {
    display: flex;
    gap: 9px;
    flex-shrink: 0;
  }
  .act-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 20px;
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .act-btn.primary {
    color: #fff;
  }
  .act-btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .act-btn.primary:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .act-btn.secondary {
    color: var(--text-2);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .act-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.09);
  }

  /* KPI strip */
  .kpi-strip {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
  }
  .kpi {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 15px;
    padding: 16px;
    transition:
      transform 0.18s,
      border-color 0.2s;
  }
  .kpi:hover {
    transform: translateY(-2px);
  }
  .kpi-v {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .kpi-l {
    font-size: 0.6rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    margin-top: 3px;
  }
  .kpi-s {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  /* Org strip */
  .org-strip {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .org-card {
    min-width: 140px;
    padding: 14px;
    border: 1px solid;
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
  }
  .org-name {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-2);
    margin-bottom: 5px;
  }
  .org-earn {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .org-tx {
    font-size: 0.58rem;
    color: var(--text-3);
    margin-top: 2px;
  }

  /* TX card */
  .tx-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--rim);
    border-radius: 18px;
    overflow: hidden;
  }
  .tx-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .card-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .card-ti {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin-top: 2px;
  }

  .filters {
    display: flex;
    gap: 6px;
  }
  .fchip {
    padding: 4px 11px;
    border-radius: 100px;
    font-size: 0.67rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .fchip:hover {
    color: var(--text-2);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .tx-list {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tx-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: background 0.12s;
  }
  .tx-row:hover {
    background: rgba(255, 255, 255, 0.045);
  }
  .tx-ic {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .tx-info {
    flex: 1;
    min-width: 0;
  }
  .tx-desc {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .tx-meta {
    font-size: 0.6rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .mono {
    font-family: monospace;
    font-size: 0.58rem;
  }
  .tx-right {
    text-align: right;
    flex-shrink: 0;
  }
  .tx-amt {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .tx-st {
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .empty {
    padding: 44px 20px;
    text-align: center;
    color: var(--text-3);
  }
  .empty-ti {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-2);
    margin: 10px 0 4px;
  }
  .empty-sub {
    font-size: 0.75rem;
  }

  /* Modal */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--ink-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  .modal-hd {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 24px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  .modal-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .modal-ti {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .x-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    color: var(--text-3);
    font-size: 0.82rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .x-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-1);
  }

  .modal-body {
    padding: 18px 24px;
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .balance-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 13px;
    border: 1px solid;
    border-radius: 10px;
  }
  .hint-lbl {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hint-val {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  .mfield {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mlabel {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .opt {
    opacity: 0.5;
    font-size: 0.55rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 1px 5px;
    border-radius: 4px;
  }
  .minput {
    padding: 10px 13px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.87rem;
    color: var(--text-1);
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .minput:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.25);
  }
  .minput::placeholder {
    color: var(--text-3);
    opacity: 0.6;
  }

  .phone-row {
    display: flex;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
  }
  .phone-row:focus-within {
    border-color: rgba(255, 255, 255, 0.25);
  }
  .phone-pfx {
    padding: 10px 12px;
    font-size: 0.82rem;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
  }
  .phone-in {
    border: none !important;
    background: transparent !important;
    border-radius: 0 !important;
    flex: 1;
  }
  .phone-in:focus {
    outline: none;
  }

  .quick-row {
    display: flex;
    gap: 6px;
  }
  .quick-btn {
    flex: 1;
    padding: 7px 4px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 9px;
    font-family: var(--font-body);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .quick-btn:hover {
    color: var(--text-2);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .m-err {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 9px;
    font-size: 0.74rem;
    color: #f87171;
  }

  .modal-ft {
    display: flex;
    gap: 9px;
    padding: 12px 24px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
  .btn-cancel {
    flex: 1;
    padding: 11px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.09);
  }
  .btn-action {
    flex: 2;
    padding: 11px;
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: all 0.15s;
  }
  .btn-action:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .btn-action:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .spin {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 860px) {
    .content {
      padding: 24px 18px;
    }
    .hero {
      flex-direction: column;
      align-items: flex-start;
    }
    .hero-actions {
      width: 100%;
    }
    .act-btn {
      flex: 1;
      justify-content: center;
    }
    .kpi-strip {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
</style>
