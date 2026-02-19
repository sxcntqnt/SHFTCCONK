<script lang="ts">
  import { notifications, removeNotification, pauseNotification, resumeNotification } from '$lib/features/notifications/stores/notifications';
  import { fly, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';

  const icons = { success: '✅', error: '🚨', info: 'ℹ️', warning: '⚠️' };
  const pointerData = new Map<string, { startX: number; startTime: number; }>();
  const VELOCITY_THRESHOLD = 0.3;

  function handlePointerDown(e: PointerEvent, id: string) {
    const notifElem = e.currentTarget as HTMLElement;
    notifElem.setPointerCapture(e.pointerId);
    pointerData.set(id, { startX: e.clientX, startTime: Date.now() });
  }

  function handlePointerMove(e: PointerEvent, id: string) {
    const data = pointerData.get(id);
    if (!data) return;
    const deltaX = e.clientX - data.startX;
    (e.currentTarget as HTMLElement).style.transform = `translateX(${deltaX}px)`;
  }

  function handlePointerUp(e: PointerEvent, id: string) {
    const notifElem = e.currentTarget as HTMLElement;
    const data = pointerData.get(id);
    if (!data) return;
    const deltaX = e.clientX - data.startX;
    const deltaTime = Date.now() - data.startTime;
    const velocity = Math.abs(deltaX / deltaTime);
    notifElem.style.transform = '';
    notifElem.releasePointerCapture(e.pointerId);
    pointerData.delete(id);

    if (Math.abs(deltaX) > 120 || velocity > VELOCITY_THRESHOLD) removeNotification(id);
  }

  function handleMouseEnter(id: string) { pauseNotification(id); }
  function handleMouseLeave(id: string) { resumeNotification(id); }
</script>

<div class="fixed top-6 right-6 flex flex-col gap-3 z-[100] w-full max-w-[320px] pointer-events-none">
  {#each $notifications as notif (notif.id)}
    <div
      class="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl hover:shadow-lg active:scale-[0.98] transition-all"
      animate:flip={{ duration: 400, easing: cubicOut }}
      in:fly={{ x: 50, opacity: 0, duration: 500 }}
      out:fly={{ x: 20, opacity: 0, duration: 300 }}
      on:pointerdown={(e) => handlePointerDown(e, notif.id)}
      on:pointermove={(e) => handlePointerMove(e, notif.id)}
      on:pointerup={(e) => handlePointerUp(e, notif.id)}
      on:mouseenter={() => handleMouseEnter(notif.id)}
      on:mouseleave={() => handleMouseLeave(notif.id)}
    >
      <div class="flex items-start gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lg">{icons[notif.type]}</span>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-gray-900 truncate">{notif.title}</h4>
          <p class="text-xs leading-relaxed text-gray-600 mt-0.5 truncate">{notif.message}</p>
        </div>
        <button on:click={() => removeNotification(notif.id)} class="text-gray-400 hover:text-gray-900 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Polished Live Progress Bar -->
      <div 
        class="absolute bottom-0 left-0 h-1 bg-current opacity-20"
        style="
          width: {notif.isHovered ? `${(notif.remaining! / (notif.duration ?? 5000)) * 100}%` : '0%'};
          transition: width linear {notif.remaining}ms;
        "
      ></div>
    </div>
  {/each}
</div>