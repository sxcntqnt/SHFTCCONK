<!-- src/routes/calender/+page.svelte -->
<script lang="ts">
  import DatePicker from "$lib/components/DatePicker.svelte"
  import { enhance } from "$app/forms"
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  let selectedDate = $state(new Date())

  let selectedDateStr = $derived(selectedDate.toISOString().split("T")[0])

  let dailyTrips = $derived(
    data.activities.filter((trip) => trip.date === selectedDateStr),
  )

  let showSuccess = $state(false)

  function handleSuccess() {
    showSuccess = true
    setTimeout(() => {
      showSuccess = false
    }, 3000)
  }
</script>

<div class="min-h-screen bg-zinc-50 font-sans">
  <!-- HEADER -->
  <header class="bg-white border-b shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div
          class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-inner"
        >
          🚇
        </div>

        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">
            Commute Journeys
          </h1>
          <p class="text-sm text-zinc-500">Premium daily trip planner</p>
        </div>
      </div>

      <div class="flex items-center gap-3 text-sm text-zinc-500">
        <div
          class="px-4 py-2 bg-white border rounded-3xl shadow-sm flex items-center gap-2"
        >
          <span class="text-emerald-500">●</span>
          Today •
          {new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </div>
      </div>
    </div>
  </header>

  <div
    class="max-w-7xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10"
  >
    <!-- CALENDAR PANEL -->
    <div
      class="lg:col-span-5 bg-white rounded-3xl shadow-xl p-8 border border-zinc-100"
    >
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-zinc-900">Pick a day</h2>

        <button
          onclick={() => (selectedDate = new Date())}
          class="text-xs px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-colors text-zinc-600"
        >
          Today
        </button>
      </div>

      <!-- NEW DATE PICKER -->
      <div class="rounded-2xl border border-zinc-100 shadow-inner p-2">
        <DatePicker bind:selected={selectedDate} />
      </div>

      <p class="mt-6 text-xs text-zinc-400 text-center">
        Select any date to view or add commutes
      </p>
    </div>

    <!-- MAIN CONTENT -->
    <div class="lg:col-span-7 space-y-8">
      <!-- DATE HEADER -->
      <div class="flex items-end justify-between">
        <div>
          <p class="text-sm uppercase tracking-widest text-zinc-500">
            YOUR JOURNEYS ON
          </p>

          <h2 class="text-4xl font-semibold text-zinc-900 tracking-tighter">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(selectedDate)}
          </h2>
        </div>

        <div class="text-right">
          <span class="text-5xl font-light text-blue-600">
            {dailyTrips.length}
          </span>
          <span class="block text-xs uppercase tracking-widest text-zinc-400">
            trips
          </span>
        </div>
      </div>

      <!-- TRIPS LIST -->
      {#if dailyTrips.length > 0}
        <div class="space-y-6">
          {#each dailyTrips as trip (trip.id)}
            <div
              class="bg-white border border-zinc-100 rounded-3xl p-7 shadow-sm hover:shadow-md transition-all group"
            >
              <div class="flex gap-6 items-start">
                <div class="w-20 text-right">
                  <div class="text-3xl font-semibold text-zinc-900">
                    {trip.time}
                  </div>
                  <div class="text-xs text-emerald-600 font-medium">
                    commute
                  </div>
                </div>

                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <div class="text-sm font-medium text-zinc-700">
                      {trip.from}
                    </div>

                    <div
                      class="flex-1 h-px bg-gradient-to-r from-zinc-200 via-blue-200 to-zinc-200"
                    ></div>

                    <div class="text-sm font-medium text-zinc-700">
                      {trip.to}
                    </div>
                  </div>

                  <div class="mt-2 flex items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1 text-xs px-3 py-1 bg-zinc-100 rounded-2xl text-zinc-600"
                    >
                      {#if trip.mode === "Car"}
                        🚗
                      {:else if trip.mode === "Train"}
                        🚄
                      {:else if trip.mode === "Bike"}
                        🚲
                      {:else}
                        🚶
                      {/if}

                      {trip.mode}
                    </span>

                    {#if trip.notes}
                      <span class="text-xs text-zinc-400">
                        • {trip.notes}
                      </span>
                    {/if}
                  </div>
                </div>

                <button
                  class="opacity-0 group-hover:opacity-100 transition-all text-xs px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl"
                >
                  Delete
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div
          class="bg-white border border-dashed border-zinc-200 rounded-3xl p-16 text-center"
        >
          <div
            class="mx-auto w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-4xl mb-6"
          >
            🛤️
          </div>

          <p class="text-zinc-400 text-lg">
            No commutes scheduled for this day yet
          </p>

          <p class="text-sm text-zinc-500 mt-2 max-w-xs mx-auto">
            Add your first morning or evening journey below
          </p>
        </div>
      {/if}

      <!-- Premium Add Trip Form -->
      <div class="bg-white rounded-3xl shadow-xl p-8 border border-zinc-100">
        <h3 class="text-xl font-semibold mb-6 flex items-center gap-3">
          <span class="text-blue-600">✚</span>
          Add New Journey for {new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
          }).format(selectedDate)}
        </h3>

        <form
          method="POST"
          action="?/add"
          use:enhance
          onsubmit={handleSuccess}
          class="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <input type="hidden" name="date" value={selectedDateStr} />

          <!-- Time -->
          <div>
            <label class="block text-xs font-medium text-zinc-500 mb-2"
              >DEPARTURE TIME</label
            >
            <input
              type="time"
              name="time"
              required
              class="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 rounded-2xl px-5 py-4 text-lg outline-none transition-all"
            />
          </div>

          <!-- Mode -->
          <div>
            <label class="block text-xs font-medium text-zinc-500 mb-2"
              >TRANSPORT MODE</label
            >
            <select
              name="mode"
              required
              class="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 rounded-2xl px-5 py-4 text-lg outline-none transition-all"
            >
              <option value="Car">🚗 Car</option>
              <option value="Train">🚄 Train</option>
              <option value="Bike">🚲 Bike</option>
              <option value="Walk">🚶 Walk</option>
            </select>
          </div>

          <!-- From -->
          <div>
            <label class="block text-xs font-medium text-zinc-500 mb-2"
              >FROM</label
            >
            <input
              type="text"
              name="from"
              placeholder="Home / Office"
              required
              value="Home"
              class="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 rounded-2xl px-5 py-4 text-lg outline-none transition-all"
            />
          </div>

          <!-- To -->
          <div>
            <label class="block text-xs font-medium text-zinc-500 mb-2"
              >TO</label
            >
            <input
              type="text"
              name="to"
              placeholder="Office / Home"
              required
              value="Office"
              class="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 rounded-2xl px-5 py-4 text-lg outline-none transition-all"
            />
          </div>

          <!-- Notes (spans both columns) -->
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-zinc-500 mb-2"
              >NOTES (optional)</label
            >
            <textarea
              name="notes"
              rows="2"
              placeholder="Traffic heavy today • Take scenic route"
              class="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-400 rounded-2xl px-5 py-4 text-lg outline-none transition-all resize-y"
            ></textarea>
          </div>

          <button
            type="submit"
            class="md:col-span-2 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-5 rounded-3xl text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.985]"
          >
            Save Journey
          </button>
        </form>
      </div>

      {#if showSuccess}
        <div
          class="fixed bottom-8 right-8 bg-emerald-600 text-white text-sm px-6 py-3 rounded-3xl shadow-2xl flex items-center gap-3 animate-fade-in"
        >
          <span>✅</span>
          Journey added successfully!
        </div>
      {/if}
    </div>
  </div>

  <!-- Footer note -->
  <footer class="text-center text-xs text-zinc-400 py-12">
    Built with <span class="font-semibold">svelte-calendar</span> (Light theme from
    official editor) • Premium polished commute manager
  </footer>
</div>

<style>
  /* Light theme override – paste your exported CSS from the official theme editor here */
  .svelte-calendar-wrapper :global(.calendar) {
    /* Your custom light theme variables */
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.4s ease forwards;
  }
</style>
