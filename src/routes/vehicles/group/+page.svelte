<script>
  import {
    PageShell,
    Card,
    Modal,
    Input,
    Table,
  } from "$lib/components/VehicleMngr.svelte"

  let showModal = false

  let groups = [
    { id: 1, name: "buru58" },
    { id: 2, name: "ronga" },
  ]
</script>

<PageShell title="Vehicle Groups">
  <svelte:fragment slot="actions">
    <button
      on:click={() => (showModal = true)}
      class="px-5 py-3 rounded-xl bg-black text-white hover:opacity-80"
    >
      Add New Group
    </button>
  </svelte:fragment>

  <Card>
    <Table headers={["S.No", "Name", "Action"]}>
      {#each groups as g}
        <tr class="border-t">
          <td class="px-5 py-4">{g.id}</td>
          <td>{g.name}</td>

          <td class="space-x-3"> 👁️ 🗑️ </td>
        </tr>
      {/each}
    </Table>
  </Card>
</PageShell>

<Modal
  bind:open={showModal}
  title="Add New Group"
  close={() => (showModal = false)}
>
  <div class="space-y-5">
    <Input label="Name" placeholder="Enter Group Name" />
    <Input label="Description" placeholder="Enter Description" />

    <div class="flex justify-end gap-3 pt-4">
      <button
        on:click={() => (showModal = false)}
        class="px-4 py-2 rounded-lg border"
      >
        Close
      </button>

      <button class="px-5 py-2 rounded-lg bg-blue-600 text-white">
        Save
      </button>
    </div>
  </div>
</Modal>
