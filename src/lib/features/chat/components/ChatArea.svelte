<script>
  import { activeContact, currentUser, messages, loadMessages, socketConn } from '$lib/stores/chat';
  import ChatHistory from './ChatHistory.svelte';
  import ChatInput from './ChatInput.svelte';
  import { get } from 'svelte/store';

  export let isMobile;

  $: contact = $activeContact;
  $: chats = $messages[contact] || [];
</script>

{#if $activeContact}
  <div class="flex-1 flex flex-col min-w-0 bg-base-200/50">
    <div class="px-5 py-3 border-b flex items-center gap-3 bg-base-100">
      <div class="avatar placeholder">
        <div class="bg-primary text-primary-content rounded-full w-10">
          <span>{$activeContact.slice(0, 2).toUpperCase()}</span>
        </div>
      </div>
      <div>
        <div class="font-medium">{$activeContact}</div>
        {#if $typingUsers.has($activeContact)}
          <div class="text-xs text-success">typing...</div>
        {/if}
      </div>
    </div>

    <ChatHistory {chats} contact={$activeContact} {currentUser} fetchMessages={loadMessages} />

    <ChatInput {contact} />
  </div>
{:else}
  <div class="flex-1 flex items-center justify-center opacity-60">
    <div class="text-center">
      <div class="text-2xl mb-2">Welcome to chat</div>
      <p>Select or add a contact to begin</p>
    </div>
  </div>
{/if}