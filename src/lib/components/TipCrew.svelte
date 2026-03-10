<!-- src/lib/components/TipCrew.svelte -->
<script lang="ts">
  interface Props {
    driverName?: string
    conductorName?: string
    onTip: (driverAmount: number, conductorAmount: number) => void
  }

  let {
    driverName = "Driver",
    conductorName = "Conductor",
    onTip,
  }: Props = $props()

  let showModal = $state(false)
  let totalAmount = $state(0)
  let splitPercent = $state(60)
  let customMode = $state(false)
  let customInput = $state("")
  let sending = $state(false)

  const presets = [50, 100, 200, 500]

  let driverAmount = $derived(Math.round((totalAmount * splitPercent) / 100))
  let conductorAmount = $derived(totalAmount - driverAmount)
  let canSubmit = $derived(totalAmount > 0 && !sending)

  function selectPreset(amount: number) {
    customMode = false
    customInput = ""
    totalAmount = amount
  }

  function handleCustomInput() {
    const val = parseInt(customInput)
    totalAmount = isNaN(val) || val < 0 ? 0 : val
  }

  async function submit() {
    if (!canSubmit) return
    sending = true
    await new Promise((r) => setTimeout(r, 600))
    onTip(driverAmount, conductorAmount)
    closeModal()
  }

  function closeModal() {
    showModal = false
    totalAmount = 0
    splitPercent = 60
    customMode = false
    customInput = ""
    sending = false
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closeModal()
  }

  $effect(() => {
    if (showModal) {
      window.addEventListener("keydown", handleKeydown)
      document.body.style.overflow = "hidden"
      return () => {
        window.removeEventListener("keydown", handleKeydown)
        document.body.style.overflow = ""
      }
    }
  })
</script>

<button
  class="crew-action-btn"
  onclick={() => (showModal = true)}
  aria-label="Tip your crew"
>
  <div class="btn-content">
    <span class="btn-icon">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        <circle cx="16" cy="8" r="2" />
      </svg>
    </span>
    <div class="btn-text">
      <div class="btn-title">Tip Crew</div>
      <div class="btn-subtitle">Appreciate your driver & conductor</div>
    </div>
  </div>
</button>

{#if showModal}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="tip-modal-title"
    class="tip-overlay"
    onclick={handleOverlayClick}
  >
    <div class="tip-modal" class:tip-sending={sending}>
      <div class="tip-header">
        <h2 id="tip-modal-title" class="tip-title">Tip Your Crew</h2>
        <p class="tip-desc">Show appreciation for a great ride</p>
        <button class="tip-close" onclick={closeModal} aria-label="Close">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            ><line x1="18" y1="6" x2="6" y2="18" /><line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            /></svg
          >
        </button>
      </div>

      <div class="tip-amount-display">
        <span class="tip-currency">KES</span>
        <span class="tip-total">{totalAmount.toLocaleString()}</span>
      </div>

      <div class="tip-presets">
        {#each presets as amount}
          <button
            class="tip-preset"
            class:tip-preset-active={totalAmount === amount && !customMode}
            onclick={() => selectPreset(amount)}
          >
            {amount}
          </button>
        {/each}
        <button
          class="tip-preset"
          class:tip-preset-active={customMode}
          onclick={() => {
            customMode = true
            totalAmount = 0
          }}
        >
          Other
        </button>
      </div>

      {#if customMode}
        <div class="tip-custom tip-slide-in">
          <input
            type="number"
            bind:value={customInput}
            oninput={handleCustomInput}
            placeholder="Enter amount"
            class="tip-custom-input"
            min="0"
          />
        </div>
      {/if}

      {#if totalAmount > 0}
        <div class="tip-split tip-slide-in">
          <span class="tip-split-label">Split between crew</span>
          <div class="tip-split-bar">
            <div class="tip-split-driver" style="width: {splitPercent}%">
              <span class="tip-split-amount">{driverAmount}</span>
            </div>
            <div
              class="tip-split-conductor"
              style="width: {100 - splitPercent}%"
            >
              <span class="tip-split-amount">{conductorAmount}</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            bind:value={splitPercent}
            class="tip-slider"
          />
          <div class="tip-split-labels">
            <div class="tip-crew-label">
              <div class="tip-crew-dot tip-dot-driver"></div>
              <div>
                <span class="tip-crew-name">{driverName}</span>
                <span class="tip-crew-pct">{splitPercent}%</span>
              </div>
            </div>
            <div class="tip-crew-label">
              <div class="tip-crew-dot tip-dot-conductor"></div>
              <div>
                <span class="tip-crew-name">{conductorName}</span>
                <span class="tip-crew-pct">{100 - splitPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div class="tip-actions">
        <button class="tip-btn-cancel" onclick={closeModal}>Cancel</button>
        <button class="tip-btn-send" onclick={submit} disabled={!canSubmit}>
          {#if sending}
            <div class="tip-spinner"></div>
            Sending…
          {:else}
            Send Tip
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .tip-overlay {
    position: fixed;
    inset: 0;
    background: oklch(0.15 0.02 260 / 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
    animation: tip-ov-in 0.25s ease-out;
  }
  @keyframes tip-ov-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .tip-modal {
    background: white;
    border-radius: 24px 24px 20px 20px;
    padding: 1.75rem 1.5rem 1.5rem;
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 -8px 40px oklch(0.2 0.02 260 / 0.15);
    animation: tip-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    transition: filter 0.3s ease;
  }
  .tip-sending {
    filter: brightness(0.97);
    pointer-events: none;
  }
  @keyframes tip-up {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (min-width: 640px) {
    .tip-overlay {
      align-items: center;
    }
    .tip-modal {
      border-radius: 24px;
    }
  }

  .tip-header {
    position: relative;
    text-align: center;
    margin-bottom: 1.25rem;
  }
  .tip-title {
    font-size: 1.25rem;
    font-weight: 750;
    color: oklch(0.18 0.02 260);
    margin: 0;
    letter-spacing: -0.02em;
  }
  .tip-desc {
    font-size: 0.82rem;
    color: oklch(0.55 0.02 260);
    margin: 0.2rem 0 0;
  }
  .tip-close {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    background: oklch(0.96 0.005 260);
    color: oklch(0.5 0.02 260);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .tip-close:hover {
    background: oklch(0.93 0.005 260);
  }

  .tip-amount-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
    padding: 1rem;
    background: oklch(0.97 0.003 260);
    border-radius: 16px;
  }
  .tip-currency {
    font-size: 1rem;
    font-weight: 600;
    color: oklch(0.5 0.02 260);
  }
  .tip-total {
    font-size: 2.5rem;
    font-weight: 800;
    color: oklch(0.18 0.02 260);
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .tip-presets {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .tip-preset {
    flex: 1;
    padding: 0.65rem 0.25rem;
    border: 1.5px solid oklch(0.91 0.005 260);
    border-radius: 12px;
    background: white;
    font-size: 0.88rem;
    font-weight: 650;
    color: oklch(0.35 0.02 260);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }
  .tip-preset:hover {
    border-color: oklch(0.6 0.18 155);
    background: oklch(0.97 0.01 155);
  }
  .tip-preset-active {
    border-color: oklch(0.6 0.18 155);
    background: oklch(0.6 0.18 155 / 0.08);
    color: oklch(0.4 0.15 155);
  }

  .tip-custom {
    margin-bottom: 1rem;
  }
  .tip-custom-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1.5px solid oklch(0.91 0.005 260);
    border-radius: 14px;
    font-size: 1.1rem;
    font-weight: 600;
    color: oklch(0.2 0.02 260);
    text-align: center;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
    -moz-appearance: textfield;
  }
  .tip-custom-input::-webkit-inner-spin-button,
  .tip-custom-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }
  .tip-custom-input:focus {
    border-color: oklch(0.6 0.18 155);
    box-shadow: 0 0 0 3px oklch(0.6 0.18 155 / 0.08);
  }

  .tip-split {
    margin-bottom: 1.25rem;
    padding: 1rem;
    background: oklch(0.97 0.003 260);
    border-radius: 16px;
  }
  .tip-split-label {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: oklch(0.5 0.02 260);
    display: block;
    margin-bottom: 0.75rem;
  }
  .tip-split-bar {
    display: flex;
    height: 36px;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }
  .tip-split-driver {
    background: linear-gradient(
      135deg,
      oklch(0.62 0.18 155),
      oklch(0.55 0.16 160)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.25s ease;
    min-width: 30px;
  }
  .tip-split-conductor {
    background: linear-gradient(
      135deg,
      oklch(0.65 0.16 250),
      oklch(0.58 0.18 255)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.25s ease;
    min-width: 30px;
  }
  .tip-split-amount {
    font-size: 0.78rem;
    font-weight: 700;
    color: white;
  }
  .tip-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: oklch(0.91 0.005 260);
    border-radius: 100px;
    outline: none;
    margin-bottom: 0.75rem;
    cursor: pointer;
  }
  .tip-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    box-shadow:
      0 1px 4px oklch(0.3 0.02 260 / 0.2),
      0 0 0 2px oklch(0.6 0.18 155 / 0.3);
    cursor: grab;
  }
  .tip-split-labels {
    display: flex;
    justify-content: space-between;
  }
  .tip-crew-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tip-crew-dot {
    width: 10px;
    height: 10px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .tip-dot-driver {
    background: oklch(0.6 0.18 155);
  }
  .tip-dot-conductor {
    background: oklch(0.62 0.18 250);
  }
  .tip-crew-name {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: oklch(0.3 0.02 260);
  }
  .tip-crew-pct {
    display: block;
    font-size: 0.72rem;
    color: oklch(0.55 0.02 260);
  }

  .tip-actions {
    display: flex;
    gap: 0.6rem;
  }
  .tip-btn-cancel {
    flex: 1;
    padding: 0.8rem;
    border: 1.5px solid oklch(0.91 0.005 260);
    border-radius: 14px;
    background: white;
    font-size: 0.92rem;
    font-weight: 600;
    color: oklch(0.4 0.02 260);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s ease;
  }
  .tip-btn-cancel:hover {
    background: oklch(0.97 0.003 260);
  }
  .tip-btn-send {
    flex: 1.5;
    padding: 0.8rem;
    border: none;
    border-radius: 14px;
    font-size: 0.92rem;
    font-weight: 700;
    font-family: inherit;
    color: white;
    background: linear-gradient(
      135deg,
      oklch(0.62 0.18 155),
      oklch(0.52 0.16 160)
    );
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease,
      opacity 0.15s ease;
  }
  .tip-btn-send:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 18px oklch(0.52 0.16 160 / 0.35);
  }
  .tip-btn-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .tip-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: tip-spin 0.6s linear infinite;
  }
  @keyframes tip-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .tip-slide-in {
    animation: tip-si 0.25s ease-out;
  }
  @keyframes tip-si {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Trigger button – make it look like a card/sibling to RateCrew */
  .crew-action-btn {
    width: 100%;
    background: rgb(21, 151, 69);
    border: 2px solid oklch(0.91 0.005 260); /* light gray, matches your modal borders */
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    cursor: pointer;
    transition: all 0.18s ease;
    box-shadow: 0 2px 8px oklch(0.2 0.02 260 / 0.08);
    text-align: left;
    font-family: inherit;
  }

  .crew-action-btn:hover {
    border-color: oklch(0.6 0.18 155); /* green accent for tip action */
    transform: translateY(-2px);
    box-shadow: 0 6px 20px oklch(0.6 0.18 155 / 0.15);
  }

  .crew-action-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px oklch(0.6 0.18 155 / 0.3);
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .btn-icon {
    flex-shrink: 0;
    color: oklch(30.226% 0.0099 164.444); /* green to signal positive/tip action */
    background: oklch(62.575% 0.12701 150.501 / 0.6);
    padding: 0.75rem;
    border-radius: 12px;
    line-height: 0;
  }

  .btn-text {
    flex: 1;
  }

  .btn-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: oklch(0.18 0.02 260);
    margin-bottom: 0.25rem;
  }

  .btn-subtitle {
    font-size: 0.875rem;
    color: oklch(35.246% 0.08301 260.917);
    line-height: 1.4;
  }
</style>
