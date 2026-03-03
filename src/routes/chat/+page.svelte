<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import {
    currentUser,
    activeContact,
    fetchContacts,
    addNewContact,
    socketConn,
  } from "$lib/features/chat/stores/store"
  import { initSocket } from "$lib/features/chat/services/chatService"
  import Sidebar from "$lib/features/chat/components/Sidebar.svelte"
  import ChatArea from "$lib/features/chat/components/ChatArea.svelte"
  import { get } from "svelte/store"

  let showSidebar = $state(true)
  let isMobile = $state(false)

  function updateMobile() {
    isMobile = window.innerWidth < 1024
    if (!isMobile) showSidebar = true
  }

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    currentUser.set(urlParams.get("u") || "guest")
    await fetchContacts(get(currentUser))
    const sock = initSocket()
    sock.connected(get(currentUser))
    updateMobile()
    window.addEventListener("resize", updateMobile)
  })

  onDestroy(() => {
    window.removeEventListener("resize", updateMobile)
  })
</script>

<div class="chat-page">
  <!-- Top bar -->
  <div class="chat-topbar">
    <div class="topbar-left">
      {#if isMobile}
        <button
          class="hamburger"
          onclick={() => (showSidebar = !showSidebar)}
          aria-label="Toggle sidebar"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      {/if}
      <span class="topbar-title">Matatu<span>Pulse</span> Chat</span>
    </div>

    <div style="display:flex;align-items:center;gap:10px;">
      <div class="live-badge">
        <span class="live-dot"></span>
        Live
      </div>
      <span class="user-pill">{$currentUser}</span>
    </div>
  </div>

  <!-- Chat body -->
  <div class="chat-body">
    <Sidebar
      bind:showSidebar
      {isMobile}
      onAddContact={(username) => addNewContact(username)}
    />

    <ChatArea {isMobile} onOpenSidebar={() => (showSidebar = true)} />

    {#if isMobile && showSidebar}
      <div
        class="mobile-overlay"
        role="presentation"
        onclick={() => (showSidebar = false)}
      ></div>
    {/if}
  </div>
</div>

<style>
  /* ── Full-height chat shell ── */
  .chat-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }

  /* ── Top bar ── */
  .chat-topbar {
    height: 54px;
    padding: 0 20px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 12, 0.7);
    backdrop-filter: blur(16px);
    flex-shrink: 0;
    z-index: 10;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .hamburger {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-2);
    padding: 6px;
    border-radius: 8px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .hamburger:hover {
    background: var(--rim);
    color: var(--text-1);
  }

  .topbar-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .topbar-title span {
    color: var(--orange);
  }

  /* Live indicator */
  .live-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.2);
    padding: 3px 9px;
    border-radius: 100px;
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse 2s ease-out infinite;
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }

  /* User pill */
  .user-pill {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--rim);
    padding: 4px 10px;
    border-radius: 100px;
  }

  /* ── Chat body ── */
  .chat-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Mobile overlay */
  .mobile-overlay {
    display: none;
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 15;
    animation: fade-in 0.15s ease;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ── Responsive ── */
  @media (max-width: 1023px) {
    .hamburger {
      display: flex;
    }
  }
</style>
