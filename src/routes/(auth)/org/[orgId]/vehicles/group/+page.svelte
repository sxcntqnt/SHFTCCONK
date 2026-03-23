<script lang="ts">
  import { enhance } from "$app/forms"
  import {
    PageShell,
    Card,
    Modal,
    Input,
    Table,
  } from "$lib/features/vehicles/VehicleMngr"

  interface Group {
    id: string
    name: string
    description: string
    vehicles: number
  }
  interface Props {
    data: { orgId: string; groups: Group[] }
    form: { success?: boolean; message?: string } | null
  }

  let { data, form }: Props = $props()

  let showModal = $state(false)
  let newName = $state("")
  let newDesc = $state("")
  let saving = $state(false)

  // Close modal on successful form action
  $effect(() => {
    if (form?.success) {
      showModal = false
      newName = ""
      newDesc = ""
    }
  })

  function openModal() {
    showModal = true
  }
  function closeModal() {
    showModal = false
    newName = ""
    newDesc = ""
  }
</script>

<PageShell title="Vehicle Groups">
  {#snippet actions()}
    <button class="add-btn" onclick={openModal}>
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
      Add Group
    </button>
  {/snippet}

  {#if form?.message}
    <div class="error-banner">{form.message}</div>
  {/if}

  <Card>
    <Table headers={["#", "Group Name", "Description", "Vehicles", "Actions"]}>
      {#if data.groups.length === 0}
        <tr class="empty-row">
          <td colspan="5">No vehicle groups yet. Add one to get started.</td>
        </tr>
      {:else}
        {#each data.groups as g, i}
          <tr>
            <td>{i + 1}</td>
            <td style="color:var(--text-1);font-weight:600;">{g.name}</td>
            <td style="color:var(--text-3);font-size:0.8rem;"
              >{g.description || "—"}</td
            >
            <td>
              <span class="count-badge">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <path d="M16 8h4l3 3v5h-7z" />
                </svg>
                {g.vehicles}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button class="row-btn" title="View group" onclick={() => {}}>
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

                <!-- Delete via form action -->
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={g.id} />
                  <button
                    type="submit"
                    class="row-btn danger"
                    title="Delete group"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </form>
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    </Table>
  </Card>
</PageShell>

<!-- Create group modal — uses form action -->
<Modal open={showModal} title="Add Vehicle Group" close={closeModal}>
  <form
    method="POST"
    action="?/create"
    use:enhance={() => {
      saving = true
      return async ({ update }) => {
        saving = false
        await update()
      }
    }}
  >
    <div class="modal-form">
      <Input
        label="Group Name"
        name="name"
        placeholder="e.g. Buru 58"
        bind:value={newName}
        required
      />
      <Input
        label="Description"
        name="description"
        placeholder="Optional description"
        bind:value={newDesc}
      />
      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick={closeModal}
          >Cancel</button
        >
        <button
          type="submit"
          class="btn-save"
          disabled={saving || !newName.trim()}
        >
          {#if saving}
            <span class="btn-spinner"></span>Saving…
          {:else}
            Save Group
          {/if}
        </button>
      </div>
    </div>
  </form>
</Modal>

<style>
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
  .error-banner {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    color: #f87171;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 0.82rem;
    margin-bottom: 16px;
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
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-1);
  }
  .row-btn.danger:hover {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.25);
    color: #f87171;
  }
  .count-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .count-badge svg {
    color: var(--orange);
  }
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    margin-top: 4px;
  }
  .btn-cancel {
    padding: 9px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.18);
  }
  .btn-save {
    padding: 9px 20px;
    background: var(--orange);
    border: none;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(242, 101, 34, 0.25);
    display: flex;
    align-items: center;
    gap: 7px;
    transition: background 0.15s;
  }
  .btn-save:hover {
    background: #d95618;
  }
  .btn-save:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
  }
  .btn-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .empty-row td {
    padding: 48px 20px !important;
    text-align: center;
    color: var(--text-3) !important;
    font-size: 0.875rem !important;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
