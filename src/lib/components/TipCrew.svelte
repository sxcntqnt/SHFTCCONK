<!-- src/lib/components/TipCrew.svelte -->
<script lang="ts">
  let {
    driverName = "Driver",
    conductorName = "Conductor",
    onTip,
  }: {
    driverName?: string
    conductorName?: string
    onTip: (driverAmount: number, conductorAmount: number) => void
  } = $props()

  let showModal = false
  let driverTip = 50
  let conductorTip = 50
  let tipDriver = true
  let tipConductor = true

  const quickTips = [20, 50, 100, 200, 500]

  function open() {
    showModal = true
  }

  function close() {
    showModal = false
  }

  function submit() {
    const d = tipDriver ? Math.max(0, driverTip) : 0
    const c = tipConductor ? Math.max(0, conductorTip) : 0
    onTip(d, c)
    close()
  }

  function setQuick(role: "driver" | "conductor", amt: number) {
    if (role === "driver") driverTip = amt
    else conductorTip = amt
  }
</script>

<button
  on:click={open}
  class="btn btn-success w-full rounded-2xl text-lg py-7 font-semibold shadow-md hover:shadow-lg transition-all"
>
  <span class="text-xl"> Tip Crew</span>
</button>

{#if showModal}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    on:click={close}
  >
    <div
      class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
      on:click|stopPropagation
    >
      <h2 class="text-2xl font-bold mb-6 text-center">Tip the Crew</h2>

      <p class="text-center text-gray-600 mb-6">
        Driver: {driverName} • Conductor: {conductorName}<br />
        Tip any amount you feel is right
      </p>

      <div class="space-y-8">
        <!-- Driver -->
        <div>
          <label class="flex items-center justify-between mb-3">
            <span class="font-semibold text-lg">Tip Driver</span>
            <input
              type="checkbox"
              bind:checked={tipDriver}
              class="toggle toggle-success"
            />
          </label>
          {#if tipDriver}
            <div class="flex flex-wrap gap-2 mb-4">
              {#each quickTips as amt}
                <button
                  on:click={() => setQuick("driver", amt)}
                  class="btn btn-sm {driverTip === amt
                    ? 'btn-primary'
                    : 'btn-outline'}"
                >
                  KES {amt}
                </button>
              {/each}
            </div>
            <input
              type="number"
              bind:value={driverTip}
              min="0"
              step="10"
              class="input input-bordered w-full text-center text-xl font-bold"
              placeholder="Custom amount (KES)"
            />
          {/if}
        </div>

        <!-- Conductor -->
        <div>
          <label class="flex items-center justify-between mb-3">
            <span class="font-semibold text-lg">Tip Conductor</span>
            <input
              type="checkbox"
              bind:checked={tipConductor}
              class="toggle toggle-success"
            />
          </label>
          {#if tipConductor}
            <div class="flex flex-wrap gap-2 mb-4">
              {#each quickTips as amt}
                <button
                  on:click={() => setQuick("conductor", amt)}
                  class="btn btn-sm {conductorTip === amt
                    ? 'btn-primary'
                    : 'btn-outline'}"
                >
                  KES {amt}
                </button>
              {/each}
            </div>
            <input
              type="number"
              bind:value={conductorTip}
              min="0"
              step="10"
              class="input input-bordered w-full text-center text-xl font-bold"
              placeholder="Custom amount (KES)"
            />
          {/if}
        </div>
      </div>

      <div class="mt-10 flex gap-4 border-t pt-6">
        <div class="flex-1 text-center">
          <p class="text-sm text-gray-600">Total</p>
          <p class="text-2xl font-bold text-green-700">
            KES {(tipDriver ? driverTip : 0) +
              (tipConductor ? conductorTip : 0)}
          </p>
        </div>
        <button on:click={close} class="btn btn-outline flex-1">Cancel</button>
        <button on:click={submit} class="btn btn-primary flex-1"
          >Send Tip</button
        >
      </div>
    </div>
  </div>
{/if}
