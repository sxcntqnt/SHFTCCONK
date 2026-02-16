<script lang="ts">
  // Simple marketing chat placeholder moved into marketing area
  let message = ''
  let messages: string[] = []
  function send() {
    if (!message) return
    messages = [...messages, message]
    message = ''
  }
</script>

<div class="p-6 max-w-3xl mx-auto">
  <h1 class="text-2xl font-bold mb-4">Chat & Support</h1>
  <div class="border rounded p-4 mb-4 bg-white min-h-[200px]">
    {#if messages.length === 0}
      <div class="text-gray-500">No messages yet — say hi.</div>
    {:else}
      {#each messages as m}
        <div class="mb-2">{m}</div>
      {/each}
    {/if}
  </div>

  <div class="flex gap-2">
    <input class="flex-1 border rounded px-3 py-2" bind:value={message} placeholder="Message" />
    <button class="btn btn-primary" on:click={send}>Send</button>
  </div>
</div>
