<script>
  export let contacts = [];
  export let selected = '';
  export let onSelect;

  function formatLast(ts) {
    const date = new Date(ts * 1000);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
</script>

<div class="divide-y divide-base-300">
  {#each contacts as contact (contact.username)}
    <button
      class="w-full px-4 py-3 flex items-center gap-3 hover:bg-base-200 transition-colors text-left
             {selected === contact.username ? 'bg-base-200' : ''}"
      on:click={() => onSelect(contact.username)}
    >
      <div class="avatar placeholder">
        <div class="bg-neutral text-neutral-content rounded-full w-10">
          <span class="text-xl">
            {contact.username.slice(0,2).toUpperCase()}
          </span>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="font-medium truncate">{contact.username}</div>
        <div class="text-xs opacity-60">
          Last: {formatLast(contact.last_activity)}
        </div>
      </div>
    </button>
  {/each}

  {#if contacts.length === 0}
    <div class="py-10 text-center opacity-50 text-sm">
      No contacts yet • Add someone above
    </div>
  {/if}
</div>