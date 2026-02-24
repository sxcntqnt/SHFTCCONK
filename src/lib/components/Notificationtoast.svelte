<!-- src/lib/components/NotificationToast.svelte -->
<script lang="ts">
  type ToastType = 'success' | 'error' | 'warning' | 'info'

  interface Toast {
    id: string
    type?: ToastType
    title?: string
    message: string
    duration?: number   // ms — 0 = persistent
  }

  // Toast store — components push to this array to show toasts
  let toasts = $state<Toast[]>([])

  // Expose push() so other components can import and call it
  export function push(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID()
    const entry: Toast = { id, duration: 4000, type: 'info', ...toast }
    toasts = [...toasts, entry]
    if (entry.duration && entry.duration > 0) {
      setTimeout(() => dismiss(id), entry.duration)
    }
  }

  function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id)
  }

  const ICONS: Record<ToastType, string> = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  }

  const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(0,176,155,0.10)',   border: 'rgba(0,176,155,0.28)',   icon: '#00b09b' },
    error:   { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)', icon: '#f87171' },
    warning: { bg: 'rgba(250,204,21,0.10)',  border: 'rgba(250,204,21,0.28)',  icon: '#facc15' },
    info:    { bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.28)',  icon: '#60a5fa' },
  }
</script>

<style>
  .toast-region {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    min-width: 280px;
    max-width: 380px;
    pointer-events: all;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: toast-in 0.25s ease both;
  }

  @keyframes toast-in {
    from { opacity: 0; transform: translateX(20px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0)    scale(1); }
  }

  .toast-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    background: rgba(255,255,255,0.08);
  }

  .toast-body { flex: 1; min-width: 0; }
  .toast-title {
    font-family: var(--font-display, 'Syne', sans-serif);
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255,255,255,0.95);
    margin-bottom: 2px;
  }
  .toast-message {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
  }

  .toast-close {
    background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,0.3); padding: 0; flex-shrink: 0;
    transition: color 0.15s;
    display: flex; align-items: center;
  }
  .toast-close:hover { color: rgba(255,255,255,0.7); }
</style>

<!-- Toast stack — renders in bottom-right corner -->
<div class="toast-region" aria-live="polite" aria-label="Notifications">
  {#each toasts as toast (toast.id)}
    {@const type = toast.type ?? 'info'}
    {@const c = COLORS[type]}
    <div
      class="toast"
      role="alert"
      style="background:{c.bg}; border:1px solid {c.border};"
    >
      <div class="toast-icon" style="color:{c.icon};">
        {@html ICONS[type]}
      </div>
      <div class="toast-body">
        {#if toast.title}
          <div class="toast-title">{toast.title}</div>
        {/if}
        <div class="toast-message">{toast.message}</div>
      </div>
      <button class="toast-close" onclick={() => dismiss(toast.id)} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {/each}
</div>