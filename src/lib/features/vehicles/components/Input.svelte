<script lang="ts">
  interface Props {
    label?: string
    type?: string
    placeholder?: string
    value?: string
    required?: boolean
    disabled?: boolean
    hint?: string
  }
  let {
    label = "",
    type = "text",
    placeholder = "",
    value = $bindable(""),
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
  <input bind:value {type} {placeholder} {required} {disabled} class="field" />
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

  .field {
    width: 100%;
    padding: 11px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-1);
    outline: none;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
    -webkit-appearance: none;
  }
  .field::placeholder {
    color: var(--text-3);
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

  /* Date input calendar icon tint */
  .field[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
    cursor: pointer;
  }

  .field-hint {
    font-size: 0.7rem;
    color: var(--text-3);
    line-height: 1.4;
  }
</style>
