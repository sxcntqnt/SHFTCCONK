<script lang="ts">
  import { enhance } from "$app/forms"
  import {
    PageShell,
    Card,
    Input,
    Select,
  } from "$lib/features/vehicles/VehicleMngr"

  interface Device {
    id: string
    identifier: string
    api_url: string
  }
  interface Group {
    id: string
    name: string
  }

  interface Props {
    data: {
      orgId: string
      groups: Group[]
      availableDevices: Device[]
    }
    form: { message?: string } | null
  }

  let { data, form }: Props = $props()

  // ── Form state ───────────────────────────────────────────────────────
  let reg = $state("")
  let name = $state("")
  let model = $state("")
  let chassis = $state("")
  let engine = $state("")
  let mfgBy = $state("")
  let vType = $state("")
  let color = $state("")
  let regExpiry = $state("")
  let groupId = $state("")

  // Device linking — pick existing OR enter raw credentials
  let deviceMode = $state<"existing" | "new" | "none">("none")
  let deviceId = $state("")
  let apiUrl = $state("")
  let apiUsername = $state("")
  let apiPassword = $state("")

  let saving = $state(false)

  let canSubmit = $derived(
    reg.trim() !== "" &&
      name.trim() !== "" &&
      chassis.trim() !== "" &&
      vType !== "" &&
      groupId !== "",
  )

  const groupOptions = $derived(
    data.groups.map((g) => ({ value: g.id, label: g.name })),
  )
  const deviceOptions = $derived(
    data.availableDevices.map((d) => ({
      value: d.id,
      label: `${d.identifier} — ${d.api_url}`,
    })),
  )
</script>

<PageShell title="Add Vehicle">
  <form
    method="POST"
    use:enhance={() => {
      saving = true
      return async ({ update }) => {
        saving = false
        await update()
      }
    }}
  >
    {#if form?.message}
      <div class="error-banner">{form.message}</div>
    {/if}

    <Card>
      <!-- ── Vehicle Details ─────────────────────────────────────────── -->
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
            <rect x="1" y="3" width="15" height="13" />
            <path d="M16 8h4l3 3v5h-7z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          Vehicle Details
        </div>
        <div class="section-divider-line"></div>
      </div>

      <div class="field-grid">
        <Input
          label="Registration Number"
          name="registration"
          placeholder="e.g. KDA 787D"
          bind:value={reg}
          required
        />
        <Input
          label="Vehicle Name"
          name="name"
          placeholder="e.g. Mamba"
          bind:value={name}
          required
        />
        <Input
          label="Model"
          name="model"
          placeholder="e.g. NQR"
          bind:value={model}
        />
        <Input
          label="Chassis No"
          name="chassis"
          placeholder="Enter chassis number"
          bind:value={chassis}
          required
        />
        <Input
          label="Engine No"
          name="engine"
          placeholder="Enter engine number"
          bind:value={engine}
        />
        <Input
          label="Manufactured By"
          name="manufactured_by"
          placeholder="e.g. Isuzu"
          bind:value={mfgBy}
        />
        <Select
          label="Vehicle Type"
          name="vehicle_type"
          options={["Bus", "Van", "Matatu", "Shuttle", "Minibus"]}
          bind:value={vType}
          required
        />
        <Input
          label="Vehicle Colour"
          name="color"
          placeholder="e.g. White / Yellow"
          bind:value={color}
        />
        <Input
          label="Registration Expiry"
          name="registration_expiry"
          type="date"
          bind:value={regExpiry}
        />
        <Select
          label="Vehicle Group"
          name="group_id"
          options={groupOptions.map((g) => g.label)}
          values={groupOptions.map((g) => g.value)}
          bind:value={groupId}
          required
        />
      </div>

      <!-- ── GPS / Device Linking ────────────────────────────────────── -->
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
          GPS Device
        </div>
        <div class="section-divider-line"></div>
      </div>

      <!-- Mode toggle -->
      <div class="device-mode-tabs">
        <button
          type="button"
          class="mode-tab"
          class:active={deviceMode === "none"}
          onclick={() => (deviceMode = "none")}
        >
          No Device
        </button>
        {#if data.availableDevices.length > 0}
          <button
            type="button"
            class="mode-tab"
            class:active={deviceMode === "existing"}
            onclick={() => (deviceMode = "existing")}
          >
            Link Existing Device
          </button>
        {/if}
        <button
          type="button"
          class="mode-tab"
          class:active={deviceMode === "new"}
          onclick={() => (deviceMode = "new")}
        >
          Add New Device
        </button>
      </div>

      {#if deviceMode === "existing"}
        <div class="field-grid" style="margin-top:16px;">
          <Select
            label="Select Device"
            name="device_id"
            options={deviceOptions.map((d) => d.label)}
            values={deviceOptions.map((d) => d.value)}
            bind:value={deviceId}
          />
        </div>
      {:else if deviceMode === "new"}
        <div class="field-grid" style="margin-top:16px;">
          <Input
            label="API URL"
            name="api_url"
            placeholder="https://track.example.com/api"
            bind:value={apiUrl}
            hint="Base endpoint for GPS data feed"
          />
          <Input
            label="API Username"
            name="api_username"
            placeholder="Enter username"
            bind:value={apiUsername}
          />
          <Input
            label="API Password"
            name="api_password"
            type="password"
            placeholder="Enter password"
            bind:value={apiPassword}
          />
        </div>
      {/if}

      <!-- ── Form Actions ─────────────────────────────────────────────── -->
      <div class="form-actions">
        <div class="required-hint">
          <span></span> Required fields
        </div>
        <a href="/org/{data.orgId}/vehicles" class="btn-cancel">
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
          type="submit"
          class="btn-submit"
          disabled={!canSubmit || saving}
        >
          {#if saving}
            <span class="btn-spinner"></span>Saving…
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
  </form>
</PageShell>

<style>
  .error-banner {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    color: #f87171;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 0.82rem;
    margin-bottom: 16px;
  }
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
  .field-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px 18px;
  }
  /* Device mode tabs */
  .device-mode-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
  }
  .mode-tab {
    padding: 7px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background: rgba(255, 255, 255, 0.03);
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-tab:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-2);
  }
  .mode-tab.active {
    background: rgba(242, 101, 34, 0.12);
    border-color: rgba(242, 101, 34, 0.3);
    color: var(--orange);
  }
  /* Form actions */
  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
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
