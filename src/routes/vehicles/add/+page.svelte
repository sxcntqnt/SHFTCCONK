<script>
  import PageShell from "../components/PageShell.svelte"
  import Card from "../components/Card.svelte"
  import Input from "../components/Input.svelte"
  import Select from "../components/Select.svelte"
</script>

<PageShell title="Add Vehicle">
  <Card>
    <div class="grid md:grid-cols-3 gap-6">
      <Input label="Registration Number" />
      <Input label="Vehicle Name" />
      <Input label="Model" />

      <Input label="Chassis No" />
      <Input label="Engine No" />
      <Input label="Manufactured By" />

      <Select label="Vehicle Type" options={["Bus", "Van", "Matatu"]} />

      <Input label="Vehicle Color" />

      <Input type="date" label="Registration Expiry" />

      <Select label="Vehicle Group" options={["buru58", "ronga"]} />
    </div>

    <hr class="my-8" />

    <h3 class="font-semibold text-lg mb-4">GPS API Details</h3>

    <div class="grid md:grid-cols-3 gap-6">
      <Input label="API URL" />
      <Input label="API Username" />
      <Input label="API Password" />
    </div>

    <div class="flex justify-end mt-8">
      <button class="px-6 py-3 rounded-xl bg-black text-white hover:opacity-80">
        Add Vehicle
      </button>
    </div>
  </Card>
</PageShell>
