<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let icon: typeof import('lucide-svelte').Home | null = null;
</script>

<div class="bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg p-4 flex flex-col items-center justify-center hover:shadow-xl transition">
  {#if icon}
    <svelte:component this={icon} class="w-6 h-6 mb-2 text-blue-600"/>
  {/if}
  <div class="text-sm font-medium text-gray-500">{title}</div>
  <div class="text-2xl font-bold">{value}</div>
</div>