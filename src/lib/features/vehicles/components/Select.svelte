<script lang="ts">
  interface Props {
    label?: string
    value?: string
    options?: string[]
    required?: boolean
    disabled?: boolean
    hint?: string
  }
  let {
    label = "",
    value = $bindable(""),
    options = [],
    required = false,
    disabled = false,
    hint = "",
  }: Props = $props()
</script>

<div class="field-wrap">
  {#if label}
    <label class="field-label">
      {label}
      {#if required}<span class="required-dot"></span>{/if}
    </label>
  {/if}
  <div class="select-wrap">
    <select bind:value {required} {disabled} class="field">
      <option value="" disabled selected>Select…</option>
      {#each options as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
    <span class="chevron">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  </div>
  {#if hint}
    <span class="field-hint">{hint}</span>
  {/if}
</div>

<style>
  .field-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .required-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--orange);
    flex-shrink: 0;
  }

  .select-wrap {
    position: relative;
  }

  .field {
    width: 100%;
    padding: 11px 36px 11px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-1);
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
  }
  .field:focus {
    border-color: rgba(242, 101, 34, 0.45);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }
  .field:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Colour the option dropdown background on supported browsers */
  .field option {
    background: #13131e;
    color: #fff;
  }
  .field option:disabled {
    color: rgba(255, 255, 255, 0.35);
  }

  /* Custom chevron */
  .chevron {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--text-3);
  }

  .field-hint {
    font-size: 0.7rem;
    color: var(--text-3);
    line-height: 1.4;
  }
</style>
