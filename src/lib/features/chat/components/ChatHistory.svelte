<script>
  import { onMount } from 'svelte';
  import { formatChatTimestamp } from '$lib/features/chat/utils/date';
  export let chats = [];
  export let currentUser = '';
  export let contact = '';
  export let fetchMessages;

  let container;
  let loadingOlder = false;

  function onScroll() {
    if (container.scrollTop < 50 && !loadingOlder && chats.length > 0) loadOlder();
  }

  async function loadOlder() {
    loadingOlder = true;
    const oldest = chats[0]?.timestamp;
    await fetchMessages(contact, oldest);
    loadingOlder = false;
  }

  onMount(() => {
    container.addEventListener('scroll', onScroll);
    return () => container?.removeEventListener('scroll', onScroll);
  });

  $: if (container) {
    const threshold = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (threshold < 100) container.scrollTop = container.scrollHeight;
  }
</script>

<div bind:this={container} class="flex-1 flex flex-col gap-3 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-base-content/30">
  {#each chats as msg (msg.id ?? msg.timestamp)}
    <div class="chat {msg.from === currentUser ? 'chat-end' : 'chat-start'}">
      <div class="chat-bubble {msg.from === currentUser ? 'chat-bubble-primary' : 'chat-bubble-secondary'} max-w-[80%] break-words">
        {msg.message}
        <div class="chat-footer opacity-70 text-xs mt-1">{formatChatTimestamp(msg.timestamp)}</div>
      </div>
    </div>
  {/each}
  {#if loadingOlder}
    <div class="text-center opacity-50 text-sm mt-2">Loading older messages...</div>
  {/if}
</div>