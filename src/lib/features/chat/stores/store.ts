import { writable, get, type Writable } from 'svelte/store';
import axios, { type AxiosResponse } from 'axios';

/* -------------------------------------------------------------------------- */
/*                                API CONFIG                                  */
/* -------------------------------------------------------------------------- */

const API: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface ChatMessage {
  id?: string;
  from: string;
  to: string;
  message: string;
  timestamp: number; // unix seconds
}

export interface Contact {
  username: string;
  last_activity: number; // unix seconds
}

export interface MessagesMap {
  [contact: string]: ChatMessage[];
}

export interface SocketConnection {
  sendMsg(data: unknown): void
  connect(cb: (event: MessageEvent) => void): void
  connected(user: string): void
  on(event: string, cb: () => void): void
  reconnect?(): void
}

/* ------------------------------ API Responses ----------------------------- */

interface ContactsResponse {
  data: Contact[];
}

interface MessagesResponse {
  messages: ChatMessage[];
}

/* -------------------------------------------------------------------------- */
/*                                   STORES                                   */
/* -------------------------------------------------------------------------- */

export const currentUser: Writable<string> = writable('');
export const socketConn: Writable<SocketConnection | null> = writable(null);
export const activeContact: Writable<string> = writable('');
export const messages: Writable<MessagesMap> = writable({});
export const typingUsers: Writable<Set<string>> = writable(new Set());
export const contacts: Writable<Contact[]> = writable([]);
export const contactsLoading: Writable<boolean> = writable(false);
export const contactsError: Writable<string> = writable('');

/* -------------------------------------------------------------------------- */
/*                             MESSAGE MANAGEMENT                             */
/* -------------------------------------------------------------------------- */

const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function addMessage(contact: string, msg: ChatMessage): void {
  messages.update(m => {
    const conversation = m[contact] ?? [];
    return { ...m, [contact]: [...conversation, msg] };
  });
}

export function addMessagesBatch(
  contact: string,
  newMessages: ChatMessage[],
  prepend = false
): void {
  messages.update(m => {
    const conversation = m[contact] ?? [];
    return {
      ...m,
      [contact]: prepend
        ? [...newMessages, ...conversation]
        : [...conversation, ...newMessages]
    };
  });
}

export function setMessages(contact: string, msgs: ChatMessage[]): void {
  messages.update(m => ({ ...m, [contact]: msgs }));
}

/* -------------------------------------------------------------------------- */
/*                                  TYPING                                    */
/* -------------------------------------------------------------------------- */

export function markUserTyping(username: string): void {
  typingUsers.update(set => {
    const next = new Set(set);
    next.add(username);
    return next;
  });

  if (typingTimeouts.has(username)) {
    clearTimeout(typingTimeouts.get(username)!);
  }

  const timeout = setTimeout(() => {
    typingUsers.update(set => {
      const next = new Set(set);
      next.delete(username);
      return next;
    });
    typingTimeouts.delete(username);
  }, 3000);

  typingTimeouts.set(username, timeout);
}

/* -------------------------------------------------------------------------- */
/*                                  CONTACTS                                  */
/* -------------------------------------------------------------------------- */

export async function fetchContacts(username: string): Promise<void> {
  contactsLoading.set(true);
  contactsError.set('');

  try {
    const res: AxiosResponse<ContactsResponse> =
      await axios.get(`${API}/contact-list?username=${encodeURIComponent(username)}`);

    contacts.set(res.data?.data ?? []);
  } catch (err) {
    console.error('Failed to fetch contacts', err);
    contactsError.set('Failed to load contacts');
  } finally {
    contactsLoading.set(false);
  }
}

export function addNewContact(username: string): void {
  contacts.update(c => [
    {
      username,
      last_activity: Math.floor(Date.now() / 1000)
    },
    ...c
  ]);
}

/* -------------------------------------------------------------------------- */
/*                             MESSAGE PAGINATION                             */
/* -------------------------------------------------------------------------- */

export async function loadMessages(
  contact: string,
  beforeTimestamp: number | null = null,
  limit = 50
): Promise<void> {
  const user = get(currentUser);
  if (!user) return;

  try {
    const params = new URLSearchParams({
      contact,
      limit: String(limit)
    });

    if (beforeTimestamp !== null) {
      params.set('before', String(beforeTimestamp));
    }

    const res: AxiosResponse<MessagesResponse> =
      await axios.get(`${API}/messages?username=${encodeURIComponent(user)}&${params.toString()}`);

    if (res.data?.messages) {
      addMessagesBatch(contact, res.data.messages, beforeTimestamp !== null);
    }
  } catch (err) {
    console.error('Failed to fetch messages', err);
  }
}
