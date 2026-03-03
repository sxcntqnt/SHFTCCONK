<script lang="ts">
  import {
    socketConn,
    currentUser,
    activeContact,
    addMessage,
    markUserTyping,
  } from "$lib/features/chat/stores/store"

  interface Props {
    contact: string
  }
  let { contact }: Props = $props()

  let messageInput = $state("")
  let textarea: HTMLTextAreaElement

  function sendMessage() {
    if (!messageInput.trim() || !contact) return
    const payload = {
      type: "message",
      chat: {
        from: $currentUser,
        to: contact,
        message: messageInput.trim(),
        timestamp: Math.floor(Date.now() / 1000),
      },
    }
    $socketConn?.sendMsg(payload)
    addMessage(contact, payload.chat)
    messageInput = ""
    // Reset textarea height
    if (textarea) textarea.style.height = "auto"
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  let typingTimer: ReturnType<typeof setTimeout>
  function onInput() {
    if (!contact || !$socketConn) return
    clearTimeout(typingTimer)
    $socketConn.sendMsg({ type: "typing", from: $currentUser, to: contact })
    markUserTyping($currentUser)
    // Auto-grow textarea
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px"
    }
  }

  let canSend = $derived(messageInput.trim().length > 0)
</script>

<div class="input-bar">
  <div class="textarea-wrap">
    <textarea
      bind:this={textarea}
      bind:value={messageInput}
      class="msg-textarea"
      placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
      rows="1"
      oninput={onInput}
      onkeydown={onKeydown}
    ></textarea>
    <span class="send-hint">↵ send · ⇧↵ newline</span>
  </div>

  <button
    class="send-btn"
    onclick={sendMessage}
    disabled={!canSend}
    aria-label="Send message"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  </button>
</div>

<style>
  .input-bar {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid var(--rim);
    background: rgba(10, 10, 12, 0.6);
    backdrop-filter: blur(12px);
    flex-shrink: 0;
  }

  .textarea-wrap {
    flex: 1;
    position: relative;
  }

  .msg-textarea {
    width: 100%;
    min-height: 42px;
    max-height: 140px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 14px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--text-1);
    line-height: 1.5;
    resize: none;
    outline: none;
    display: block;
    overflow-y: auto;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
    scrollbar-width: thin;
    scrollbar-color: var(--rim-2) transparent;
  }
  .msg-textarea::placeholder {
    color: var(--text-3);
  }
  .msg-textarea:focus {
    border-color: rgba(242, 101, 34, 0.35);
    background: rgba(255, 255, 255, 0.07);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
  }

  /* Hint text */
  .send-hint {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 0.6rem;
    color: var(--text-3);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .msg-textarea:focus ~ .send-hint {
    opacity: 1;
  }

  /* Send button */
  .send-btn {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: none;
    background: var(--orange);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 3px 12px rgba(242, 101, 34, 0.28);
    transition:
      background 0.15s,
      transform 0.12s,
      box-shadow 0.15s;
  }
  .send-btn:hover:not(:disabled) {
    background: #d95618;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(242, 101, 34, 0.38);
  }
  .send-btn:disabled {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }
</style>
