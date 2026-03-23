<script lang="ts">
  import { PageShell, Card, Table } from "$lib/features/vehicles/VehicleMngr"
  import { goto } from "$app/navigation"

  type VehicleStatus = "Active" | "Idle" | "Maintenance" | "Off Route"

  interface Vehicle {
    id: string
    name: string
    reg: string
    model: string
    chassis: string
    group: string
    status: VehicleStatus
  }

  let { data }: { data: { orgId: string; vehicles: Vehicle[] } } = $props()

  let search = $state("")

  let filtered = $derived(
    search.trim() === ""
      ? data.vehicles
      : data.vehicles.filter((v) =>
          [v.name, v.reg, v.model, v.chassis, v.group]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
  )

  const STATUS: Record<
    VehicleStatus,
    { color: string; bg: string; border: string }
  > = {
    Active: {
      color: "var(--teal)",
      bg: "rgba(0,176,155,0.1)",
      border: "rgba(0,176,155,0.25)",
    },
    Idle: {
      color: "#9ca3af",
      bg: "rgba(156,163,175,0.1)",
      border: "rgba(156,163,175,0.2)",
    },
    Maintenance: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.22)",
    },
    "Off Route": {
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
    },
  }
</script>

<PageShell title="Vehicle Management">
  {#snippet actions()}
    <a href="/org/{data.orgId}/vehicles/add" class="add-btn">
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
    </a>
  {/snippet}

  <Card>
    <div class="search-wrap">
      <div class="search-field-wrap">
        <span class="search-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          class="search-field"
          bind:value={search}
          placeholder="Search by name, reg, chassis…"
        />
      </div>
      <span class="result-count">
        {filtered.length} of {data.vehicles.length} vehicle{data.vehicles
          .length !== 1
          ? "s"
          : ""}
      </span>
    </div>

    <Table
      headers={[
        "#",
        "Vehicle",
        "Registration",
        "Model",
        "Chassis",
        "Group",
        "Status",
        "Actions",
      ]}
    >
      {#if filtered.length === 0}
        <tr class="empty-row">
          <td colspan="8">
            {data.vehicles.length === 0
              ? "No vehicles added yet."
              : "No vehicles match your search."}
          </td>
        </tr>
      {:else}
        {#each filtered as v, i}
          {@const s = STATUS[v.status as VehicleStatus] ?? STATUS.Idle}
          <tr>
            <td>{i + 1}</td>
            <td style="color:var(--text-1);font-weight:700;">{v.name}</td>
            <td><span class="reg-cell">{v.reg}</span></td>
            <td>{v.model || "—"}</td>
            <td style="font-family:monospace;font-size:0.75rem;">{v.chassis}</td
            >
            <td><span class="group-badge">{v.group}</span></td>
            <td>
              <span
                class="status-pill"
                style="color:{s.color};background:{s.bg};border:1px solid {s.border};"
              >
                <span class="status-dot" style="background:{s.color};"></span>
                {v.status}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button
                  class="row-btn"
                  title="View vehicle"
                  onclick={() => goto(`/org/${data.orgId}/vehicles/${v.id}`)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  class="row-btn edit"
                  title="Edit vehicle"
                  onclick={() =>
                    goto(`/org/${data.orgId}/vehicles/${v.id}/edit`)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    </Table>
  </Card>
</PageShell>

<style>
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .search-field-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-3);
    pointer-events: none;
  }
  .search-field {
    width: 100%;
    padding: 10px 14px 10px 36px;
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
  }
  .search-field::placeholder {
    color: var(--text-3);
  }
  .search-field:focus {
    border-color: rgba(242, 101, 34, 0.4);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }
  .result-count {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
    white-space: nowrap;
  }
  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    background: var(--orange);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(242, 101, 34, 0.28);
    text-decoration: none;
    transition:
      background 0.18s,
      box-shadow 0.18s,
      transform 0.15s;
  }
  .add-btn:hover {
    background: #d95618;
    box-shadow: 0 8px 28px rgba(242, 101, 34, 0.38);
    transform: translateY(-1px);
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .reg-cell {
    font-family: "Courier New", monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-1);
    text-transform: uppercase;
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-3);
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  .row-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-1);
  }
  .row-btn.edit:hover {
    background: rgba(96, 165, 250, 0.1);
    border-color: rgba(96, 165, 250, 0.25);
    color: #60a5fa;
  }
  .empty-row td {
    padding: 48px 20px !important;
    text-align: center;
    color: var(--text-3) !important;
    font-size: 0.875rem !important;
    font-weight: 400 !important;
  }
  .group-badge {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.16);
    padding: 2px 8px;
    border-radius: 100px;
  }
</style>
