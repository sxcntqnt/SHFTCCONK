<script lang="ts">
  import { derived } from "svelte/store"
  import {
    activeContact,
    currentUser,
    messages,
    loadMessages,
    typingUsers,
  } from "$lib/features/chat/stores/store"
  import ChatHistory from "$lib/features/chat/components/ChatHistory.svelte"
  import ChatInput from "$lib/features/chat/components/ChatInput.svelte"

  interface Props {
    isMobile: boolean
    onOpenSidebar: () => void
  }
  let { isMobile, onOpenSidebar }: Props = $props()

  const contact = derived(activeContact, ($a) => $a ?? "")
  const chats = derived([messages, activeContact], ([$m, $a]) =>
    $a ? ($m[$a] ?? []) : [],
  )
  const isTyping = derived([typingUsers, activeContact], ([$t, $a]) =>
    $a ? $t.has($a) : false,
  )

  function avatarHue(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++)
      h = (h * 31 + name.charCodeAt(i)) % 360
    return h
  }
</script>

<div class="chat-area">
  {#if $contact}
    <!-- Contact header -->
    <div class="contact-header">
      {#if isMobile}
        <button
          class="back-btn"
          onclick={onOpenSidebar}
          aria-label="Back to contacts"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
      {/if}

      <div
        class="contact-avatar"
        style="background: hsl({avatarHue($contact)}, 55%, 38%);"
      >
        {$contact.slice(0, 2).toUpperCase()}
      </div>

      <div class="contact-name-wrap">
        <div class="contact-name">{$contact}</div>
        {#if $isTyping}
          <div class="typing-indicator">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
            typing
          </div>
        {/if}
      </div>
    </div>

    <!-- Messages -->
    <ChatHistory
      chats={$chats}
      contact={$contact}
      {currentUser}
      fetchMessages={loadMessages}
    />

    <!-- Input -->
    <ChatInput contact={$contact} />
  {:else}
    <!-- Empty state -->
    <div class="empty-area">
      <div class="empty-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <div class="empty-title">Start a conversation</div>
      <p class="empty-sub">
        Select a contact from the sidebar or add someone new to begin chatting.
      </p>
    </div>
  {/if}
</div>

<style>
  .chat-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--ink);
    position: relative;
  }

  /* ── Contact header ── */
  .contact-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    height: 56px;
    border-bottom: 1px solid var(--rim);
    background: rgba(10, 10, 12, 0.5);
    backdrop-filter: blur(12px);
    flex-shrink: 0;
  }

  /* Back button (mobile) */
  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    padding: 4px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .back-btn:hover {
    color: var(--text-1);
  }

  /* Avatar */
  .contact-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }

  .contact-name-wrap {
    flex: 1;
    min-width: 0;
  }
  .contact-name {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .typing-indicator {
    font-size: 0.68rem;
    color: var(--teal);
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 1px;
  }
  .typing-dots {
    display: flex;
    gap: 3px;
    align-items: center;
  }
  .typing-dots span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--teal);
    animation: dot-bounce 1.2s ease-in-out infinite;
  }
  .typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes dot-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-4px);
    }
  }

  /* ── Empty state ── */
  .empty-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 12px;
    padding: 40px;
  }
  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .empty-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-2);
  }
  .empty-sub {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.6;
    max-width: 260px;
  }
</style>
