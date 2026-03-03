<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let data: {
    polylineHash: string;
  };

  let socket: WebSocket | null = null;
  let corridorFeed: any[] = [];

  onMount(() => {
    const wsUrl = `wss://api.yourdomain.com/feed/corridor/${data.polylineHash}`;

    socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      corridorFeed = JSON.parse(event.data);
    };
  });

  onDestroy(() => {
    socket?.close();
  });
</script>

<h1 class="text-2xl font-bold mb-4">
  Corridor Feed — {data.polylineHash}
</h1>

{#if corridorFeed.length === 0}
  <p class="text-gray-500">Monitoring route...</p>
{:else}
  <ul>
    {#each corridorFeed as segment}
      <li class="border-b py-2">
        {JSON.stringify(segment)}
      </li>
    {/each}
  </ul>
{/if}