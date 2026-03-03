<script lang="ts">
  import { onMount } from "svelte"
  import { get } from "svelte/store"
  import { formatChatTimestamp } from "$lib/features/chat/utils/date"
  import { currentUser } from "$lib/features/chat/stores/store"

  interface Msg {
    id?: string
    timestamp: number
    from: string
    message: string
  }

  interface Props {
    chats: Msg[]
    contact: string
    currentUser: any // store — accessed as $currentUser in parent; passed as prop here
    fetchMessages: (contact: string, before?: number) => Promise<void>
  }
  let { chats, contact, fetchMessages }: Props = $props()

  // Access store directly since it's imported
  let me = $derived(get(currentUser))

  let container: HTMLDivElement
  let loadingOlder = $state(false)

  function onScroll() {
    if (container.scrollTop < 60 && !loadingOlder && chats.length > 0)
      loadOlder()
  }

  async function loadOlder() {
    loadingOlder = true
    const oldest = chats[0]?.timestamp
    await fetchMessages(contact, oldest)
    loadingOlder = false
  }

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    chats // track dependency
    if (!container) return
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distFromBottom < 120) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight
      })
    }
  })

  onMount(() => {
    container.scrollTop = container.scrollHeight
    container.addEventListener("scroll", onScroll)
    return () => container?.removeEventListener("scroll", onScroll)
  })
</script>

<div class="history" bind:this={container}>
  {#if loadingOlder}
    <div class="load-older">
      <span class="load-spinner"></span>
      Loading older messages…
    </div>
  {/if}

  {#each chats as msg, i (msg.id ?? msg.timestamp)}
    {@const isMine = msg.from === $currentUser}

    <!-- Date separator when day changes -->
    {#if i === 0 || new Date(msg.timestamp * 1000).toDateString() !== new Date(chats[i - 1].timestamp * 1000).toDateString()}
      <div class="date-sep">
        <div class="date-line"></div>
        <span class="date-label">
          {new Date(msg.timestamp * 1000).toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
        <div class="date-line"></div>
      </div>
    {/if}

    <div class="msg-row {isMine ? 'mine' : 'theirs'}">
      <div class="bubble {isMine ? 'mine' : 'theirs'}">
        <span class="bubble-text">{msg.message}</span>
        <span class="bubble-time">{formatChatTimestamp(msg.timestamp)}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .history {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--rim-2) transparent;
  }
  .history::-webkit-scrollbar {
    width: 3px;
  }
  .history::-webkit-scrollbar-thumb {
    background: var(--rim-2);
    border-radius: 2px;
  }

  /* ── Load older ── */
  .load-older {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px;
    font-size: 0.72rem;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .load-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--text-3);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Message row ── */
  .msg-row {
    display: flex;
    margin-bottom: 2px;
    animation: msg-in 0.2s ease both;
  }
  @keyframes msg-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .msg-row.mine {
    justify-content: flex-end;
  }
  .msg-row.theirs {
    justify-content: flex-start;
  }

  /* ── Bubble ── */
  .bubble {
    max-width: 72%;
    padding: 10px 13px;
    border-radius: 16px;
    font-size: 0.875rem;
    line-height: 1.55;
    word-break: break-word;
    position: relative;
  }

  /* Outgoing — orange tinted */
  .bubble.mine {
    background: rgba(242, 101, 34, 0.16);
    border: 1px solid rgba(242, 101, 34, 0.25);
    border-bottom-right-radius: 4px;
    color: var(--text-1);
  }

  /* Incoming — surface */
  .bubble.theirs {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-bottom-left-radius: 4px;
    color: var(--text-1);
  }

  .bubble-text {
    display: block;
  }

  .bubble-time {
    display: block;
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.32);
    margin-top: 4px;
    text-align: right;
  }
  .bubble.theirs .bubble-time {
    text-align: left;
  }

  /* ── Date separator ── */
  .date-sep {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 16px 0 10px;
  }
  .date-line {
    flex: 1;
    height: 1px;
    background: var(--rim);
  }
  .date-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
  }
</style>
