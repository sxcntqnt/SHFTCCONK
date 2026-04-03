import {
  socketConn,
  currentUser,
  addMessage,
  markUserTyping,
} from "$lib/features/chat/stores/store"
import { get } from "svelte/store"
import SocketConnection from "./socket-connection"
import type {
  ChatMessage,
  SocketConnection as SocketConnContract,
} from "$lib/features/chat/stores/store"

/* -------------------------------------------------------------------------- */
/*                                WS PROTOCOL                                 */
/* -------------------------------------------------------------------------- */

type IncomingEvent =
  | MessageEventPayload
  | TypingEventPayload
  | UnknownEventPayload

interface MessageEventPayload {
  type: "message"
  chat: ChatMessage
}

interface TypingEventPayload {
  type: "typing"
  from: string
}

interface UnknownEventPayload {
  type: string
  [key: string]: unknown
}

/* -------------------------------------------------------------------------- */
/*                              TYPE GUARDS                                   */
/* -------------------------------------------------------------------------- */

function isChatMessage(obj: unknown): obj is ChatMessage {
  if (typeof obj !== "object" || obj === null) return false
  const m = obj as Record<string, unknown>

  return (
    typeof m.from === "string" &&
    typeof m.to === "string" &&
    typeof m.message === "string" &&
    typeof m.timestamp === "number"
  )
}

function parseIncoming(data: string): IncomingEvent | null {
  try {
    const parsed: unknown = JSON.parse(data)

    if (typeof parsed !== "object" || parsed === null) return null

    const p = parsed as Record<string, unknown>

    if (p.type === "message" && isChatMessage(p.chat)) {
      return { type: "message", chat: p.chat }
    }

    if (p.type === "typing" && typeof p.from === "string") {
      return { type: "typing", from: p.from }
    }

    return { type: String(p.type ?? "unknown"), ...p }
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*                             SOCKET INITIALIZER                             */
/* -------------------------------------------------------------------------- */

export function initSocket(): SocketConnContract {
  const sock: SocketConnContract = new SocketConnection()

  sock.connect((event: MessageEvent) => {
    const parsed = parseIncoming(event.data)

    if (!parsed) {
      console.error("Invalid WS payload")
      return
    }

    switch (parsed.type) {
      case "message": {
        const me = get(currentUser)
        const msg = parsed.chat

        // determine which conversation bucket
        const contact = msg.from === me ? msg.to : msg.from

        addMessage(contact, msg)
        break
      }

      case "typing": {
        markUserTyping(parsed.from)
        break
      }

      default:
        // silently ignore unknown events (forward compatibility)
        break
    }
  })

  sock.on("disconnect", () => {
    console.warn("Socket disconnected, reconnecting...")
    setTimeout(() => sock.reconnect?.(), 3000)
  })

  socketConn.set(sock)
  return sock
}
