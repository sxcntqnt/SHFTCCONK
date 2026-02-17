<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentUser, activeContact, contacts, contactsLoading, contactsError, fetchContacts, addNewContact, socketConn } from '$lib/stores/chat';
  import { initSocket } from '$lib/services/chatService';
  import Sidebar from './Sidebar.svelte';
  import ChatArea from './ChatArea.svelte';
  import { writable } from 'svelte/store';

  let showSidebar = true;
  let isMobile = false;

  function updateMobile() { isMobile = window.innerWidth < 1024; }
  $: sidebarClass = showSidebar ? 'translate-x-0' : '-translate-x-full';

  onMount(async () => {
    const params = new URLSearchParams(location.search);
    currentUser.set(params.get('u') || 'guest');

    await fetchContacts($currentUser);

    const sock = initSocket();
    sock.connected($currentUser);

    updateMobile();
    window.addEventListener('resize', updateMobile);
  });

  onDestroy(() => window.removeEventListener('resize', updateMobile));
</script>

<div class="min-h-screen flex flex-col bg-base-200">
  <!-- Navbar -->
  <div class="navbar bg-base-100 border-b px-4">
    <div class="flex-1">
      {#if isMobile}
        <button class="btn btn-ghost btn-circle" on:click={() => showSidebar = !showSidebar}>
          <span class="material-symbols-outlined">menu</span>
        </button>
      {/if}
      <span class="ml-2 font-semibold text-xl">Chat</span>
    </div>
    <div class="badge badge-outline">{$currentUser}</div>
  </div>

  <div class="flex flex-1 overflow-hidden relative">
    <Sidebar {showSidebar} {sidebarClass} {isMobile} on:addContact={e => addNewContact(e.detail.username)} />
    <ChatArea {isMobile} />
    {#if isMobile && showSidebar}
      <div class="absolute inset-0 bg-black/40 z-10 lg:hidden" on:click={() => showSidebar = false}></div>
    {/if}
  </div>
</div>