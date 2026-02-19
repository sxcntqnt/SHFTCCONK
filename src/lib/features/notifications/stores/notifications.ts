import { writable, get } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  remaining?: number;
  start?: number;
  isHovered?: boolean;
  timestamp?: Date;
}

export interface NotificationSettings {
  muted: Record<NotificationType, boolean>;
}

const MAX_NOTIFICATIONS = 5;

// Live notifications
export const notifications = writable<Notification[]>([]);

// Per-type mute settings
export const notificationSettings = writable<NotificationSettings>({
  muted: { success: false, error: false, info: false, warning: false }
});

// Persistent feed
export const feed = writable<Notification[]>(loadFeed());

// --- Helpers for persistence ---
function loadFeed(): Notification[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem('matatu_feed');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

function saveFeed(feedArray: Notification[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('matatu_feed', JSON.stringify(feedArray.slice(0, 100)));
}

// --- Notification API ---
export function addNotification(notif: Omit<Notification, 'id' | 'remaining' | 'start' | 'isHovered' | 'timestamp'>) {
  const id = crypto.randomUUID();
  const duration = notif.duration ?? 5000;
  const newNotif: Notification = {
    ...notif,
    id,
    remaining: duration,
    start: Date.now(),
    isHovered: false,
    timestamp: new Date()
  };

  notifications.update(n => [newNotif, ...n].slice(0, MAX_NOTIFICATIONS));
  feed.update(f => {
    const updated = [newNotif, ...f];
    saveFeed(updated);
    return updated;
  });

  playSound(newNotif.type);
  vibrate(newNotif.type);

  // Auto-remove
  setTimeout(() => removeNotification(id), duration);
}

export function removeNotification(id: string) {
  notifications.update(n => n.filter(notif => notif.id !== id));
}

export function pauseNotification(id: string) {
  notifications.update(n => n.map(notif => {
    if (notif.id === id && notif.start && notif.remaining) {
      const elapsed = Date.now() - notif.start;
      return { ...notif, remaining: Math.max(notif.remaining - elapsed, 0), isHovered: true };
    }
    return notif;
  }));
}

export function resumeNotification(id: string) {
  notifications.update(n => n.map(notif => {
    if (notif.id === id && notif.remaining) {
      return { ...notif, start: Date.now(), isHovered: false };
    }
    return notif;
  }));
}

// Dismiss all of type
export function removeAllOfType(type: NotificationType) {
  notifications.update(n => n.filter(notif => notif.type !== type));
  feed.update(f => {
    const updated = f.filter(notif => notif.type !== type);
    saveFeed(updated);
    return updated;
  });
}

// --- Sensory helpers ---
function playSound(type: NotificationType) {
  const settings = get(notificationSettings);
  if (settings.muted[type]) return;
  if (typeof Audio === 'undefined') return;
  try {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
}

function vibrate(type: NotificationType) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (type === 'error') navigator.vibrate([100, 50, 100]);
  else if (type === 'warning') navigator.vibrate(100);
}