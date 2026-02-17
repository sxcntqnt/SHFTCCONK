<script lang="ts">
  import { derived } from 'svelte/store';
  import { activeContact, currentUser, messages, loadMessages, typingUsers } from '$lib/features/chat/stores/store';
  import ChatHistory from './ChatHistory.svelte';
  import ChatInput from './ChatInput.svelte';

  export let isMobile: boolean;

  // Reactive contact and chats using derived stores
  const contact = derived(activeContact, ($activeContact) => $activeContact ?? '');
  const chats = derived([messages, activeContact], ([$messages, $activeContact]) => $activeContact ? $messages[$activeContact] ?? [] : []);

  // Typing indicator as reactive store
  const isTyping = derived([typingUsers, activeContact], ([$typingUsers, $activeContact]) =>
    $activeContact ? $typingUsers.has($activeContact) : false
  );
</script>

{#if $contact}
  <div class="flex-1 flex flex-col min-w-0 bg-base-200/50">
    <!-- Chat header -->
    <div class="px-5 py-3 border-b flex items-center gap-3 bg-base-100">
      <div class="avatar placeholder">
        <div class="bg-primary text-primary-content rounded-full w-10 flex items-center justify-center font-bold">
          {$contact.slice(0, 2).toUpperCase()}
        </div>
      </div>
      <div class="flex flex-col">
        <div class="font-medium truncate">{$contact}</div>
        {#if $isTyping}
          <div class="text-xs text-success">typing...</div>
        {/if}
      </div>
    </div>

    <!-- Chat history -->
    <ChatHistory
      {chats} 
      contact={$contact}
      {currentUser}
      fetchMessages={loadMessages}
    />

    <!-- Chat input -->
    <ChatInput contact={$contact} />
  </div>
{:else}
  <!-- Empty state -->
  <div class="flex-1 flex items-center justify-center opacity-60">
    <div class="text-center">
      <div class="text-2xl mb-2">Welcome to chat</div>
      <p>Select or add a contact to begin</p>
    </div>
  </div>
{/if}
