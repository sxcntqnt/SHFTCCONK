<script>
  import { formatLastActivity } from '$lib/features/chat/utils/date';
  export let contacts = [];
  export let selected = '';
  export let onSelect;
  export let isLoading = false;
  export let fetchError = '';
</script>

<div class="divide-y divide-base-300">
  {#if isLoading}
    <div class="py-10 text-center opacity-50">Loading contacts...</div>
  {:else if fetchError}
    <div class="py-10 text-center text-error">{fetchError}</div>
  {:else if contacts.length === 0}
    <div class="py-10 text-center opacity-50 text-sm">No contacts yet • Add someone above</div>
  {:else}
    {#each contacts as contact (contact.username)}
      <button
        class="w-full px-4 py-3 flex items-center gap-3 hover:bg-base-200 transition-colors text-left {selected === contact.username ? 'bg-base-200' : ''}"
        on:click={() => onSelect(contact.username)}
      >
        <div class="avatar placeholder">
          <div class="bg-neutral text-neutral-content rounded-full w-10">
            <span class="text-xl">{contact.username.slice(0, 2).toUpperCase()}</span>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{contact.username}</div>
          <div class="text-xs opacity-60">Last: {formatLastActivity(contact.last_activity)}</div>
        </div>
      </button>
    {/each}
  {/if}
</div>