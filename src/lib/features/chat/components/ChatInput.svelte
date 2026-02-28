<script>
  import {
    socketConn,
    currentUser,
    activeContact,
    addMessage,
    markUserTyping,
  } from "$lib/features/chat/stores/store"
  import { writable } from "svelte/store"

  export let contact
  let messageInput = ""

  function sendMessage(e) {
    if (e.key !== "Enter" || e.shiftKey) return
    if (!messageInput.trim() || !contact) return

    e.preventDefault()
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
  }

  function handleTyping() {
    if (!contact || !$socketConn) return
    $socketConn.sendMsg({ type: "typing", from: $currentUser, to: contact })
    markUserTyping($currentUser)
  }
</script>

<div class="p-4 border-t bg-base-100 border-base-300">
  <textarea>
    class="textarea textarea-bordered w-full min-h-[4.5rem] resize-none"
    placeholder="Type a message… (Enter to send)" bind:value={messageInput}
    on:input={handleTyping}
    on:keydown={sendMessage}
  </textarea>
</div>
