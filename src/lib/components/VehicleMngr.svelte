<script lang="ts">
  export let title = ""

  export let label = ""
  export let type = "text"
  export let placeholder = ""
  export let value

  export let options = []

  export let open = false
  export let close
  export let headers = []
</script>

<div
  class="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
>
  <table class="w-full text-sm">
    <thead class="bg-zinc-50 dark:bg-zinc-800">
      <tr>
        {#each headers as h}
          <th class="text-left px-5 py-4 font-medium">{h}</th>
        {/each}
      </tr>
    </thead>

    <tbody>
      <slot />
    </tbody>
  </table>
</div>

{#if open}
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
  >
    <div
      class="
      w-[520px]
      bg-white dark:bg-zinc-900
      rounded-2xl
      shadow-2xl
      border border-zinc-200 dark:border-zinc-800
      animate-scale
    "
    >
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-lg font-semibold">{title}</h2>

        <button on:click={close}>✕</button>
      </div>

      <div class="p-6">
        <slot />
      </div>
    </div>
  </div>
{/if}

<div class="space-y-2">
  <label class="text-sm font-medium text-zinc-600 dark:text-zinc-300">
    {label}
  </label>

  <input
    bind:value
    {type}
    {placeholder}
    class="
      w-full px-4 py-3
      rounded-xl
      bg-zinc-50 dark:bg-zinc-800
      border border-zinc-200 dark:border-zinc-700
      focus:ring-2 focus:ring-blue-500
      outline-none transition
    "
  />
</div>

<div class="p-8 space-y-6">
  <div class="flex justify-between items-center">
    <h1
      class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white"
    >
      {title}
    </h1>

    <slot name="actions" />
  </div>

  <slot />
</div>
<div
  class="
  bg-white/70 dark:bg-zinc-900/70
  backdrop-blur-xl
  border border-zinc-200/60
  dark:border-zinc-800
  rounded-2xl
  shadow-sm
  p-6
"
>
  <slot />
</div>

<div class="space-y-2">
  <label class="text-sm font-medium">{label}</label>

  <select
    bind:value
    class="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-blue-500"
  >
    <option>Select...</option>

    {#each options as opt}
      <option value={opt}>{opt}</option>
    {/each}
  </select>
</div>
