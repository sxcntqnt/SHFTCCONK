<script lang="ts">
  export let title: string;
  export let subtitle: string = '';
</script>

<div class="mb-6">
  <h2 class="text-3xl font-bold">{title}</h2>
  {#if subtitle}
    <p class="text-gray-500 mt-1">{subtitle}</p>
  {/if}
</div>