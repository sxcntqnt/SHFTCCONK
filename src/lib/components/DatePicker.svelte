<script lang="ts">
  import { createCalendar } from "@melt-ui/svelte"
  import { today, getLocalTimeZone } from "@internationalized/date"

  let { selected = $bindable() } = $props()

  const calendar = createCalendar({
    defaultValue: today(getLocalTimeZone()),
  })

  const {
    elements: {
      calendar: calendarEl,
      grid,
      cell,
      heading,
      prevButton,
      nextButton,
    },
    states: { months },
  } = calendar
</script>

<div use:calendarEl class="p-4 bg-white rounded-2xl border shadow">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <button use:prevButton class="px-3 py-1 rounded hover:bg-zinc-100">
      ◀
    </button>

    <h2 use:heading class="font-semibold text-sm"></h2>

    <button use:nextButton class="px-3 py-1 rounded hover:bg-zinc-100">
      ▶
    </button>
  </div>

  <!-- Calendar -->
  {#each $months as month}
    <table use:grid class="w-full text-sm">
      <tbody>
        {#each month.weeks as week}
          <tr>
            {#each week as day}
              <td class="text-center p-1">
                <button
                  use:cell={{ date: day }}
                  class="w-10 h-10 rounded-lg hover:bg-blue-100
                         data-[selected]:bg-blue-600
                         data-[selected]:text-white"
                >
                  {day.day}
                </button>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
</div>
