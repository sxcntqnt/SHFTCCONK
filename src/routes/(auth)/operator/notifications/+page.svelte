<script lang="ts">
  import { addNotification, feed, removeAllOfType, notificationSettings } from '$lib/features/notifications/stores/notifications';
  import Notifications from '$lib/components/Notification.svelte';

  let title = '';
  let body = '';
  let selectedType: 'success' | 'error' | 'info' | 'warning' = 'info';
  const typeLabels: NotificationType[] = ['info','success','warning','error'];

  function triggerEvent() {
    if (!title) return;
    addNotification({ title, message: body, type: selectedType });
    title = ''; body = '';
  }

  function toggleMute(type: NotificationType) {
    notificationSettings.update(s => {
      s.muted[type] = !s.muted[type];
      return s;
    });
  }
</script>

<div class="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] p-8 font-sans">
  <!-- Live Toasts -->
  <Notifications />

  <div class="max-w-6xl mx-auto space-y-12">
    <!-- Header -->
    <header class="space-y-1">
      <h1 class="text-4xl font-semibold tracking-tight">Matatu OS Notifications</h1>
      <p class="text-lg text-gray-500 font-medium">Monitor alerts, logs, and events</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
      <!-- Manual Event Panel -->
      <section class="md:col-span-4 space-y-6">
        <div class="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm space-y-4">
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">Manual Event</h2>

          <input bind:value={title} placeholder="Event Title" class="w-full bg-gray-100/50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"/>
          <textarea bind:value={body} placeholder="Event message..." class="w-full bg-gray-100/50 border-none rounded-xl px-4 py-3 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>

          <div class="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
            {#each typeLabels as t}
              <button on:click={() => selectedType = t} 
                      class="flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all {selectedType===t?'bg-white shadow-sm text-black':'text-gray-400 hover:text-gray-600'}">
                {t.toUpperCase()}
              </button>
            {/each}
          </div>

          <button on:click={triggerEvent} class="w-full bg-[#0071E3] text-white font-semibold py-3 rounded-xl hover:bg-[#0077ED] transition-all active:scale-[0.98] shadow-md shadow-blue-200">
            Dispatch Event
          </button>

          <!-- Mute Toggle Panel -->
          <div class="flex gap-2 mt-4">
            {#each typeLabels as t}
              <button on:click={() => toggleMute(t)} 
                      class="px-3 py-1 rounded-lg text-xs font-bold border transition-all { $notificationSettings.muted[t] ? 'bg-red-100 border-red-300 text-red-600' : 'bg-green-100 border-green-300 text-green-700'}">
                {t.toUpperCase()} { $notificationSettings.muted[t] ? 'Muted' : 'On' }
              </button>
            {/each}
          </div>

        </div>
      </section>

      <!-- Feed Panel -->
      <section class="md:col-span-8 space-y-4">
        {#each typeLabels as t}
          {#if $feed.some(n => n.type === t)}
            <details open class="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white shadow-sm">
              <summary class="flex justify-between items-center cursor-pointer">
                <span class="font-semibold">{t.toUpperCase()} ({$feed.filter(n=>n.type===t).length})</span>
                <button on:click={() => removeAllOfType(t)} class="text-red-500 text-xs font-bold transition-transform active:scale-[1.05]">Dismiss All</button>
              </summary>

              <div class="mt-2 space-y-2">
                {#each $feed.filter(n=>n.type===t) as item (item.id)}
                  <div class="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex justify-between items-center" in:fly={{ y: 10, duration: 300 }}>
                    <div>
                      <p class="font-semibold text-sm">{item.title}</p>
                      <p class="text-xs text-gray-500 truncate max-w-md">{item.message}</p>
                    </div>
                    <span class="text-[10px] text-gray-400 font-mono">{item.timestamp?.toLocaleTimeString()}</span>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        {/each}
      </section>
    </div>
  </div>
</div>