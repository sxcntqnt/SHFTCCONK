<script>
  import AddContact from './AddContact.svelte';
  import ContactList from './ContactList.svelte';
  import { contacts, contactsLoading, contactsError, activeContact } from '$lib/stores/chat';
  import { createEventDispatcher } from 'svelte';
  export let showSidebar, sidebarClass, isMobile;
  const dispatch = createEventDispatcher();

  function selectContact(username) {
    activeContact.set(username);
    if (isMobile) showSidebar = false;
  }
</script>

<div class="absolute lg:static inset-y-0 left-0 w-80 z-20 bg-base-100 border-r transform transition-transform {sidebarClass} lg:flex-shrink-0 flex flex-col h-full">
  <AddContact on:contactadded={e => dispatch('addContact', e.detail)} />
  <div class="flex-1 overflow-y-auto">
    <ContactList {contacts} {contactsLoading} {contactsError} selected={$activeContact} onSelect={selectContact} />
  </div>
</div>