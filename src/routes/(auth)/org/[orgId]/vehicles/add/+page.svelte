<script lang="ts">
  import {
    PageShell,
    Card,
    Input,
    Select,
  } from "$lib/features/vehicles/VehicleMngr"
  import { goto } from "$app/navigation"

  // ── Form state ─────────────────────────────────────────────────────
  let reg = $state("")
  let name = $state("")
  let model = $state("")
  let chassis = $state("")
  let engine = $state("")
  let mfgBy = $state("")
  let vType = $state("")
  let color = $state("")
  let regExpiry = $state("")
  let group = $state("")

  let apiUrl = $state("")
  let apiUsername = $state("")
  let apiPassword = $state("")

  let saving = $state(false)
  let saved = $state(false)

  // Required fields for submit gating
  let canSubmit = $derived(
    reg.trim() !== "" &&
      name.trim() !== "" &&
      chassis.trim() !== "" &&
      vType !== "" &&
      group !== "",
  )

  async function submit() {
    if (!canSubmit) return
    saving = true
    await new Promise((r) => setTimeout(r, 700)) // replace with real API call
    saving = false
    saved = true
    setTimeout(() => goto("/operator/fleet"), 900)
  }
</script>

<PageShell title="Add Vehicle">
  <Card>
    <!-- ── Vehicle Details ── -->
    <div class="section-divider" style="margin-top:0;">
      <div class="section-label">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="1" y="3" width="15" height="13" /><path
            d="M16 8h4l3 3v5h-7z"
          />
          <circle cx="5.5" cy="18.5" r="2.5" /><circle
            cx="18.5"
            cy="18.5"
            r="2.5"
          />
        </svg>
        Vehicle Details
      </div>
      <div class="section-divider-line"></div>
    </div>

    <div class="field-grid">
      <Input
        label="Registration Number"
        placeholder="e.g. KDA 787D"
        bind:value={reg}
        required
      />
      <Input
        label="Vehicle Name"
        placeholder="e.g. Mamba"
        bind:value={name}
        required
      />
      <Input label="Model" placeholder="e.g. NQR" bind:value={model} />
      <Input
        label="Chassis No"
        placeholder="Enter chassis number"
        bind:value={chassis}
        required
      />
      <Input
        label="Engine No"
        placeholder="Enter engine number"
        bind:value={engine}
      />
      <Input
        label="Manufactured By"
        placeholder="e.g. Isuzu"
        bind:value={mfgBy}
      />
      <Select
        label="Vehicle Type"
        options={["Bus", "Van", "Matatu", "Shuttle", "Minibus"]}
        bind:value={vType}
        required
      />
      <Input
        label="Vehicle Colour"
        placeholder="e.g. White / Yellow"
        bind:value={color}
      />
      <Input label="Registration Expiry" type="date" bind:value={regExpiry} />
      <Select
        label="Vehicle Group"
        options={["Buru 58", "Ronga", "Ngong 46"]}
        bind:value={group}
        required
      />
    </div>

    <!-- ── GPS / API Details ── -->
    <div class="section-divider">
      <div class="section-label">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path
            d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
          />
        </svg>
        GPS API Details
      </div>
      <div class="section-divider-line"></div>
    </div>

    <div class="field-grid">
      <Input
        label="API URL"
        placeholder="https://track.example.com/api"
        bind:value={apiUrl}
        hint="Base endpoint for GPS data feed"
      />
      <Input
        label="API Username"
        placeholder="Enter username"
        bind:value={apiUsername}
      />
      <Input
        label="API Password"
        type="password"
        placeholder="Enter password"
        bind:value={apiPassword}
      />
    </div>

    <!-- ── Form Actions ── -->
    <div class="form-actions">
      <div class="required-hint">
        <span></span> Required fields
      </div>
      <a href="/operator/fleet" class="btn-cancel">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Cancel
      </a>
      <button
        class="btn-submit {saved ? 'saved' : ''}"
        onclick={submit}
        disabled={!canSubmit || saving || saved}
      >
        {#if saved}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved — Redirecting…
        {:else if saving}
          <span class="btn-spinner"></span>
          Saving…
        {:else}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Vehicle
        {/if}
      </button>
    </div>
  </Card>
</PageShell>

<style>
  /* ── Section header ── */
  .section-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 32px 0 24px;
  }
  .section-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
  .section-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
  }
  .section-label svg {
    color: var(--orange);
  }

  /* ── Field grid ── */
  .field-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px 18px;
  }

  /* ── Form actions ── */
  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  .btn-cancel {
    padding: 10px 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .btn-submit {
    padding: 10px 24px;
    background: var(--orange);
    border: none;
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.28);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.15s;
  }
  .btn-submit:hover:not(:disabled) {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.4);
    transform: translateY(-1px);
  }
  .btn-submit:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }
  .btn-submit.saved {
    background: var(--teal);
    box-shadow: 0 4px 16px rgba(0, 176, 155, 0.3);
  }

  .btn-spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Required hint */
  .required-hint {
    font-size: 0.68rem;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 5px;
    margin-right: auto;
  }
  .required-hint span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--orange);
    flex-shrink: 0;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .field-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 540px) {
    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
