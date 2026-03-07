<script lang="ts">
  import { onMount, onDestroy } from "svelte"

  type Data = {
    hex: string
    k: number
  }

  let { data }: { data: Data } = $props()

  let socket: WebSocket | null = null
  let feedData: any[] = []

  onMount(() => {
    const { hex, k } = data

    // Production should use env-based API URL
    const wsUrl = `wss://api.yourdomain.com/feed/h3/${hex}?k=${k}`

    socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      feedData = payload
    }

    socket.onerror = (err) => {
      console.error("Feed socket error", err)
    }
  })

  onDestroy(() => {
    socket?.close()
  })
</script>

<h1 class="text-2xl font-bold mb-4">
  Live Feed — H3: {data.hex} (k={data.k})
</h1>

{#if feedData.length === 0}
  <p class="text-gray-500">Waiting for live data...</p>
{:else}
  <ul>
    {#each feedData as item}
      <li class="border-b py-2">
        {JSON.stringify(item)}
      </li>
    {/each}
  </ul>
{/if}
