<script lang="ts">
  import {
    Chart,
    Svg,
    Axis,
    Bars,
    Highlight,
    Tooltip,
    Rule,
    Area,
    Line,
  } from "layerchart"
  import { scaleBand } from "d3-scale"
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()
  const { monthlyData } = data

  // Base data (unchanged)
  const chartData = monthlyData.map((d) => ({
    ...d,
    label: d.month,
  }))

  // 1. Sorted unique months (static)
  const availableMonths = [...new Set(monthlyData.map((d) => d.month))].sort()

  // 2. Reactive filter selections (runes mode)
  let fromMonth = $state(availableMonths[0] ?? "")
  let toMonth = $state(availableMonths.at(-1) ?? "")

  // 3. Filtered data (use $derived.by for multi-statement logic)
  let filteredData = $derived.by(() => {
    if (!fromMonth || !toMonth) return chartData

    const startIdx = availableMonths.indexOf(fromMonth)
    const endIdx = availableMonths.indexOf(toMonth)

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
      return chartData // invalid range → show all
    }

    return chartData.slice(startIdx, endIdx + 1)
  })

  // 4. Reactive averages (recomputed whenever filteredData changes)
  let avgLiters = $derived(
    filteredData.length
      ? filteredData.reduce((sum, d) => sum + d.liters, 0) / filteredData.length
      : 0,
  )

  let avgCost = $derived(
    filteredData.length
      ? filteredData.reduce((sum, d) => sum + d.cost, 0) / filteredData.length
      : 0,
  )

  let avgEfficiency = $derived(
    filteredData.length
      ? filteredData.reduce((sum, d) => sum + d.efficiency, 0) /
          filteredData.length
      : 0,
  )
</script>

<div class="w-full max-w-6xl space-y-12 pb-16">
  <div class="text-center">
    <h2 class="text-3xl font-bold mb-3 text-white">Fuel Entries & Trends</h2>
    <p class="opacity-70 text-white">
      Monthly overview — consumption, cost and efficiency
    </p>
  </div>
  <!-- Filter controls -->
  <div class="flex flex-wrap justify-center gap-6 mb-8">
    <div class="form-control">
      <label class="label">
        <span class="label-text text-white">From</span>
      </label>
      <select
        class="select select-bordered select-primary w-48 bg-base-200 text-white"
        bind:value={fromMonth}
      >
        {#each availableMonths as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text text-white">To</span>
      </label>
      <select
        class="select select-bordered select-primary w-48 bg-base-200 text-white"
        bind:value={toMonth}
      >
        {#each availableMonths as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
    </div>

    <button
      class="btn btn-outline btn-secondary mt-9"
      on:click={() => {
        fromMonth = availableMonths[0]
        toMonth = availableMonths.at(-1)
      }}
    >
      Reset
    </button>
  </div>

  <!-- Chart 1: Fuel Consumption -->
  <div class="card p-6 md:p-8">
    <h3 class="text-xl font-semibold mb-6 text-center text-white">
      Monthly Fuel Consumption (Liters)
    </h3>
    <div class="h-80">
      <Chart
        data={chartData}
        x="label"
        y="liters"
        xScale={scaleBand().padding(0.35)}
        yDomain={[0, null]}
        yNice
        padding={{ top: 24, right: 24, bottom: 48, left: 64 }}
        tooltip={{ mode: "band" }}
      >
        <Svg>
          <Axis
            placement="left"
            label="Liters"
            grid
            rule
            ticks={6}
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Axis
            placement="bottom"
            label="Month"
            rule
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Bars
            radius={8}
            rounded="top"
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1.5}
          />
          <Highlight
            area
            bar={{ radius: 10, fill: "#60a5fa", opacity: 0.85 }}
          />
          <Rule
            y={avgLiters}
            class="stroke-red-400 stroke-2 [stroke-dasharray:6_4] [stroke-linecap:round]"
          />
        </Svg>

        <Tooltip.Root class="tooltip-root">
          {#snippet children({ data })}
            <Tooltip.Header value={data.label} />

            <Tooltip.List>
              <Tooltip.Item
                label="Liters"
                value={Math.round(data.liters).toLocaleString()}
                color="#3b82f6"
              />
              <Tooltip.Item
                label="Cost"
                value={`KSh ${Math.round(data.cost).toLocaleString()}`}
                color="#facc15"
              />
              <Tooltip.Item
                label="Efficiency"
                value={`${data.efficiency.toFixed(1)} km/L`}
                color="#10b981"
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      </Chart>
    </div>
  </div>

  <!-- Chart 2: Efficiency Trend -->
  <div class="card p-6 md:p-8">
    <h3 class="text-xl font-semibold mb-6 text-center text-white">
      Fleet Efficiency Trend (km/L)
    </h3>
    <div class="h-80">
      <Chart
        data={chartData}
        x="label"
        y="efficiency"
        padding={{ top: 24, right: 24, bottom: 48, left: 64 }}
        tooltip={{ mode: "band" }}
      >
        <Svg>
          <Axis
            placement="left"
            label="km / L"
            grid
            rule
            ticks={6}
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Axis
            placement="bottom"
            label="Month"
            rule
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Area y="efficiency" fill="rgba(16, 185, 129, 0.18)" stroke="none" />
          <Line y="efficiency" color="#10b981" lineWidth={4} />
          <Highlight area fill="rgba(16, 185, 129, 0.25)" />
        </Svg>

        <Tooltip.Root class="tooltip-root">
          {#snippet children({ data })}
            <Tooltip.Header value={data.label} />

            <Tooltip.List>
              <Tooltip.Item
                label="Efficiency"
                value={`${data.efficiency.toFixed(1)} km/L`}
                color="#10b981"
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      </Chart>
    </div>
  </div>

  <!-- Chart 3: Fuel Cost Trend -->
  <div class="card p-6 md:p-8">
    <h3 class="text-xl font-semibold mb-6 text-center text-white">
      Monthly Fuel Cost (KSh)
    </h3>
    <div class="h-80">
      <Chart
        data={chartData}
        x="label"
        y="cost"
        padding={{ top: 24, right: 24, bottom: 48, left: 64 }}
        tooltip={{ mode: "band" }}
      >
        <Svg>
          <Axis
            placement="left"
            label="Cost (KSh)"
            grid
            rule
            ticks={6}
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Axis
            placement="bottom"
            label="Month"
            rule
            labelStyle={{ fill: "#f1f5f9", fontWeight: 500 }}
          />
          <Bars radius={6} fill="#facc15" stroke="#b45309" strokeWidth={1.5} />
          <Highlight
            area
            bar={{ radius: 8, fill: "rgba(250,204,21,0.5)", opacity: 0.9 }}
          />
          <Rule
            y={avgCost}
            class="stroke-yellow-400 stroke-2 [stroke-dasharray:6_4] [stroke-linecap:round]"
          />
        </Svg>

        <Tooltip.Root class="tooltip-root">
          {#snippet children({ data })}
            <Tooltip.Header value={data.label} />

            <Tooltip.List>
              <Tooltip.Item
                label="Cost"
                value={`KSh ${Math.round(data.cost).toLocaleString()}`}
                color="#facc15"
              />
            </Tooltip.List>
          {/snippet}
        </Tooltip.Root>
      </Chart>
    </div>
  </div>
</div>

<style>
  .card {
    background: #1e293b;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  /* Force dark background on tooltip popup - target common LayerChart wrappers */
  .tooltip-root,
  .tooltip-root > div,
  .tooltip-root :global(.lc-tooltip),
  .tooltip-root :global(.tooltip-content),
  .tooltip-root :global([data-tooltip]),
  :global(.lc-tooltip),
  :global(.tooltip-content) {
    background-color: #0f172a !important; /* solid slate-950 dark */
    border: 1px solid #334155 !important; /* subtle slate border for pop */
    color: #192027 !important;
    border-radius: 0.5rem !important;
    padding: 0.75rem 1rem !important;
    min-width: 180px !important; /* a bit wider for your cost values */
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(4px); /* optional subtle glass effect if you like */
  }

  /* Make sure text/labels inside are bright */
  .tooltip-root :global(strong),
  .tooltip-root :global(.font-semibold),
  .tooltip-root :global(h4),               /* if using Header as h4 */
  .tooltip-root :global(span) {
    color: #f1f5f9 !important;
  }

  /* Optional: Make the tooltip arrow (if present) match dark theme */
  .tooltip-root :global(.tooltip-arrow),
  .tooltip-root :global([data-popper-arrow]) {
    border-color: #0f172a transparent transparent transparent !important;
  }

  /* Your axis labels */
  :global(.axis text) {
    fill: #f1f5f9 !important;
    font-weight: 500;
  }
</style>
