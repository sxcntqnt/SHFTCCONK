<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import {
    currentUser,
    activeContact,
    contacts,
    contactsLoading,
    contactsError,
    fetchContacts,
    addNewContact,
    socketConn
  } from '$lib/features/chat/stores/store';
  import { initSocket } from '$lib/features/chat/services/chatService';
  import Sidebar from '$lib/features/chat/components/Sidebar.svelte';
  import ChatArea from '$lib/features/chat/components/ChatArea.svelte';

  import { get } from 'svelte/store';

  let showSidebar = true;
  let isMobile = false;
  let sidebarClass = 'translate-x-0';

  function updateMobile() {
    if (typeof window !== 'undefined') {
      isMobile = window.innerWidth < 1024;
    }
  }

  $: sidebarClass = showSidebar ? 'translate-x-0' : '-translate-x-full';

  onMount(async () => {
    // Browser-only
    if (typeof window !== 'undefined') {
      // Get query param safely
      const urlParams = new URLSearchParams(window.location.search);
      currentUser.set(urlParams.get('u') || 'guest');

      await fetchContacts(get(currentUser));

      const sock = initSocket();
      sock.connected(get(currentUser));

      updateMobile();
      window.addEventListener('resize', updateMobile);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', updateMobile);
  });
</script>

<div class="min-h-screen flex flex-col bg-base-200">
  <!-- Navbar -->
  <div class="navbar bg-base-100 border-b px-4">
    <div class="flex-1">
      {#if isMobile}
        <button class="btn btn-ghost btn-circle" on:click={() => (showSidebar = !showSidebar)}>
          <span class="material-symbols-outlined">menu</span>
        </button>
      {/if}
      <span class="ml-2 font-semibold text-xl">Chat</span>
    </div>
    <div class="badge badge-outline">{$currentUser}</div>
  </div>

  <div class="flex flex-1 overflow-hidden relative">
    <Sidebar
      {showSidebar}
      {sidebarClass}
      {isMobile}
      on:addContact={(e) => addNewContact(e.detail.username)}
    />
    <ChatArea {isMobile} />
    {#if isMobile && showSidebar}
      <div class="absolute inset-0 bg-black/40 z-10 lg:hidden" on:click={() => (showSidebar = false)}></div>
    {/if}
  </div>
</div>
