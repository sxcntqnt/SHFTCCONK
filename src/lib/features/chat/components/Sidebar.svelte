<script lang="ts">
  import AddContact from "$lib/features/chat/components/AddContact.svelte"
  import ContactList from "$lib/features/chat/components/ContactList.svelte"
  import {
    contacts,
    contactsLoading,
    contactsError,
    activeContact,
  } from "$lib/features/chat/stores/store"

  interface Props {
    showSidebar: boolean
    isMobile: boolean
    onAddContact: (username: string) => void
  }
  let { showSidebar = $bindable(), isMobile, onAddContact }: Props = $props()

  function selectContact(username: string) {
    activeContact.set(username)
    if (isMobile) showSidebar = false
  }
</script>

<div class="sidebar {isMobile ? (showSidebar ? 'visible' : 'hidden') : ''}">
  <div class="sidebar-head">
    <div class="sidebar-label">Conversations</div>
    <AddContact onContactAdded={(u) => onAddContact(u)} />
  </div>

  <div class="contact-scroll">
    <ContactList
      contacts={$contacts}
      isLoading={$contactsLoading}
      fetchError={$contactsError}
      selected={$activeContact ?? ""}
      onSelect={selectContact}
    />
  </div>
</div>

<style>
  .sidebar {
    width: 280px;
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 20;
  }

  /* Mobile: slide from left */
  @media (max-width: 1023px) {
    .sidebar {
      position: absolute;
      inset-y: 0;
      left: 0;
    }
    .sidebar.hidden {
      transform: translateX(-100%);
    }
    .sidebar.visible {
      transform: translateX(0);
    }
  }

  /* Desktop: always visible */
  @media (min-width: 1024px) {
    .sidebar {
      position: static;
      transform: none !important;
    }
  }

  /* Header */
  .sidebar-head {
    padding: 16px 18px 12px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .sidebar-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  /* Contact scroll area */
  .contact-scroll {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--rim-2) transparent;
  }
  .contact-scroll::-webkit-scrollbar {
    width: 3px;
  }
  .contact-scroll::-webkit-scrollbar-thumb {
    background: var(--rim-2);
    border-radius: 2px;
  }
</style>
