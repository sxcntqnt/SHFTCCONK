<script lang="ts">
  import { createCalendar } from "@melt-ui/svelte"
  import { today, getLocalTimeZone } from "@internationalized/date"

  let { selected = $bindable() } = $props()

  const calendar = createCalendar({
    defaultValue: today(getLocalTimeZone()),
    onValueChange: ({ next }) => {
      selected = next
      return next
    },
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

  const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
</script>

<div use:calendarEl class="dp" aria-label="Date picker">
  <!-- Header -->
  <div class="dp-header">
    <button use:prevButton class="dp-nav" aria-label="Previous month">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
    <h2 use:heading class="dp-month"></h2>
    <button use:nextButton class="dp-nav" aria-label="Next month">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  </div>

  <!-- Weekday labels -->
  <div class="dp-weekdays" aria-hidden="true">
    {#each DAY_ABBR as d}
      <span class="dp-wd">{d}</span>
    {/each}
  </div>

  <!-- Grid -->
  {#each $months as month}
    <table use:grid class="dp-grid">
      <tbody>
        {#each month.weeks as week}
          <tr>
            {#each week as day}
              <td class="dp-td">
                <button use:cell={{ date: day }} class="dp-day">
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

<style>
  .dp {
    font-family: var(--font-body);
    width: 100%;
    color: var(--text-1);
  }

  /* Header */
  .dp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .dp-month {
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .dp-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      transform 0.12s;
  }
  .dp-nav:hover {
    background: rgba(242, 101, 34, 0.12);
    border-color: rgba(242, 101, 34, 0.22);
    color: var(--orange);
    transform: scale(1.1);
  }
  .dp-nav:active {
    transform: scale(0.95);
  }

  /* Weekdays */
  .dp-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
  }
  .dp-wd {
    text-align: center;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 3px 0;
  }

  /* Grid */
  .dp-grid {
    width: 100%;
    border-collapse: collapse;
  }
  .dp-td {
    padding: 2px;
    text-align: center;
  }

  /* Day button */
  .dp-day {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 400;
    cursor: pointer;
    transition:
      background 0.14s,
      border-color 0.14s,
      color 0.14s,
      transform 0.1s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .dp-day:hover {
    background: rgba(242, 101, 34, 0.1);
    border-color: rgba(242, 101, 34, 0.2);
    color: var(--text-1);
    transform: scale(1.12);
  }
  .dp-day:active {
    transform: scale(0.95);
  }

  /* Selected */
  :global(.dp-day[data-selected]) {
    background: rgba(242, 101, 34, 0.2) !important;
    border-color: rgba(242, 101, 34, 0.4) !important;
    color: var(--orange) !important;
    font-weight: 700 !important;
    box-shadow: 0 2px 10px rgba(242, 101, 34, 0.2);
  }

  /* Today */
  :global(.dp-day[data-today]:not([data-selected])) {
    border-color: rgba(0, 176, 155, 0.3) !important;
    color: var(--teal) !important;
  }

  /* Outside month */
  :global(.dp-day[data-outside-month]) {
    color: rgba(255, 255, 255, 0.12) !important;
  }

  /* Disabled / unavailable */
  :global(.dp-day[data-disabled]),
  :global(.dp-day[data-unavailable]) {
    opacity: 0.2 !important;
    cursor: not-allowed !important;
    pointer-events: none !important;
  }
</style>
