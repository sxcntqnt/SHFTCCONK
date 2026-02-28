<script>
  import { PageShell, Table, Card } from "$lib/components/VehicleMngr.svelte"

  let vehicles = [
    {
      name: "mamba",
      reg: "kda 787d",
      model: "pimped",
      chassis: "8730920213",
      group: "buru58",
    },
  ]
</script>

<PageShell title="Vehicle Management">
  <Card>
    <div class="flex justify-end mb-4">
      <input placeholder="Search..." class="px-4 py-2 rounded-xl border" />
    </div>

    <Table
      headers={[
        "S.No",
        "Vehicle",
        "Registration",
        "Model",
        "Chassis",
        "Group",
        "Status",
        "Action",
      ]}
    >
      {#each vehicles as v, i}
        <tr class="border-t">
          <td class="px-5 py-4">{i + 1}</td>
          <td>{v.name}</td>
          <td>{v.reg}</td>
          <td>{v.model}</td>
          <td>{v.chassis}</td>
          <td>{v.group}</td>

          <td>
            <span
              class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs"
            >
              Active
            </span>
          </td>

          <td class="space-x-3"> 👁️ ✏️ </td>
        </tr>
      {/each}
    </Table>
  </Card>
</PageShell>
