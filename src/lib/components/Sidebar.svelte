<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { user, ROLES } from '$lib/auth';
  import { derived } from 'svelte/store';
  import { fade } from 'svelte/transition';

  let collapsed = false;
  let showDrawer = false;
  let menuButton: HTMLButtonElement | null = null;
  let drawerEl: HTMLElement | null = null;
  let innerWidth = 0;

  let hoverExpand = true;

  $: isDesktop = browser ? innerWidth >= 768 : false;
  $: canHoverExpand = hoverExpand && isDesktop && collapsed;

  const toggleCollapse = () => collapsed = !collapsed;
  const toggleDrawer = () => showDrawer = !showDrawer;

  const currentPath = derived(page, $page => $page.url.pathname);
  const isActive = (href: string, path: string) => path === href || path.startsWith(href + '/');

  $: dotColorClass = (() => {
    const role = $user?.role?.toUpperCase() ?? '';
    if (['PASSENGER', 'DRIVER'].includes(role)) return 'bg-green-500 ring-green-200';
    if (['OWNER', 'ORGANIZATION'].includes(role)) return 'bg-blue-500 ring-blue-200';
    if (role === 'ADMIN') return 'bg-red-500 ring-red-200';
    return 'bg-gray-500 ring-gray-200';
  })();

  const MENU_CONFIG = [
    { id: 'dashboard', href: '/app/dashboard', label: 'Home', icon: '🏠', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'feed', href: '/feed', label: 'Live Feed', icon: '🚌', roles: [ROLES.PASSENGER, ROLES.PLANNER, ROLES.REGULATOR] },
    { id: 'telemetry', href: '/app/sync', label: 'Telemetry Sync', icon: '📡', roles: [ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.OWNER] },
    { id: 'fleet', href: '/app/fleet', label: 'Fleet Manager', icon: '📊', roles: [ROLES.OWNER, ROLES.ORGANIZATION] },
    { id: 'reservations', href: '/reserve', label: 'Reservation', icon: '🎫', roles: [ROLES.PASSENGER, ROLES.ADMIN] },
    { id: 'geofences', href: '/geofences', label: 'Geofences', icon: '📍🌐', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'trips', href: '/trips', label: 'Trips', icon: '🗺️', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'fuel', href: '/fuel', label: 'Fuel', icon: '⛽', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'race', href: '/race', label: 'Race Control', icon: '🏁', roles: [ROLES.PASSENGER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'chat', href: '/chat', label: 'Chat', icon: '💬', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'weather', href: '/weather', label: 'Weather', icon: '🌤️', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'notification', href: '/notifications', label: 'Notification', icon: '📣', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'admin-panel', href: '/admin/actor_requests', label: 'Admin Panel', icon: '🛠️', roles: [ROLES.ADMIN, ROLES.ORGANIZATION] },
    { id: 'settings', href: '/settings', label: 'Settings', icon: '⚙️', roles: ['*'] }
  ];

  const visibleMenu = derived(user, $user =>
    MENU_CONFIG.filter(item => item.roles.includes('*') || item.roles.includes($user?.role ?? ''))
  );

  let focusTrapHandler: (e: KeyboardEvent) => void;

  $: if (browser && showDrawer) {
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
      drawerEl?.querySelector<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')?.focus();
    }, 0);

    focusTrapHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(drawerEl?.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', focusTrapHandler);
  } else if (browser) {
    document.body.classList.remove('overflow-hidden');
    if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler);
  }

  onMount(() => {
    const unsub = page.subscribe(() => { if (showDrawer) showDrawer = false });

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDrawer) {
        showDrawer = false;
        menuButton?.focus();
      }
    };
    document.addEventListener('keydown', escHandler);

    return () => {
      unsub();
      document.removeEventListener('keydown', escHandler);
      if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler);
    };
  });
</script>

<svelte:window bind:innerWidth />

<!-- Mobile Header -->
<div class="md:hidden flex items-center justify-between p-4 border-b bg-white shadow-sm sticky top-0 z-30">
  <h1 class="text-lg font-bold tracking-tighter">MATATU OS</h1>
  <button aria-label="Open menu" bind:this={menuButton} class="p-2 rounded-md bg-gray-50 border border-gray-200" on:click={toggleDrawer}>
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  </button>
</div>

<!-- Desktop Sidebar -->
<aside
  class="flex flex-col bg-gradient-to-b from-[#f8f9fa] to-[#f0f2f5] border-r border-gray-200 min-h-screen sticky top-0 transition-[width,box-shadow] duration-300 ease-in-out z-20"
  class:collapsed
  class:group={canHoverExpand}
>
  <!-- Header -->
  <div class="flex items-center p-6 border-b border-gray-200 min-h-[100px]">
    <div class="flex flex-col gap-1.5 min-w-0 flex-1 transition-all duration-300">
      <h1 class="text-2xl font-black tracking-tighter text-[#0a0a0a] transition-all duration-300 origin-left" 
          class:opacity-0={collapsed && !canHoverExpand}
          class:scale-75={collapsed && !canHoverExpand}>
        MATATU OS
      </h1>
      <div class="flex items-center gap-3">
        <div class="w-8 flex justify-center flex-shrink-0">
          <span class="w-2.5 h-2.5 rounded-full animate-pulse ring-2 {dotColorClass}" transition:fade></span>
        </div>
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 truncate transition-all duration-300 delay-75"
              class:opacity-0={collapsed && !canHoverExpand}
              class:translate-x-2={collapsed && !canHoverExpand}
              transition:fade>
          {$user?.role ?? 'GUEST'} MODE
        </span>
      </div>
    </div>

    <button
      class="p-2 rounded-lg hover:bg-gray-200/50 transition-all flex-shrink-0 ml-auto"
      on:click={toggleCollapse}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <svg class="w-4 h-4 text-gray-500 transition-transform duration-500" class:rotate-180={!collapsed} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-3 space-y-1 overflow-x-hidden">
    {#each $visibleMenu as item}
      <a
        href={item.href}
        aria-label={item.label}
        title={collapsed && !canHoverExpand ? item.label : undefined}
        class="flex items-center h-12 px-3 rounded-xl font-bold text-gray-600 transition-all duration-200 ease-out group/link
               {isActive(item.href, $currentPath) ? 'text-blue-700 bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-gray-200/40 hover:text-gray-900'}"
      >
        <span class="text-xl w-8 flex justify-center flex-shrink-0 transition-transform duration-200 group-hover/link:scale-110">{item.icon}</span>
        <span class="ml-3 truncate text-sm transition-all duration-300" 
              class:opacity-0={collapsed && !canHoverExpand}
              class:translate-x-4={collapsed && !canHoverExpand}
              class:translate-x-0={!collapsed || canHoverExpand}
              transition:fade>
          {item.label}
        </span>
      </a>
    {/each}
  </nav>

  <!-- User Info -->
  <div class="p-3 mt-auto border-t border-gray-200 bg-gray-50/50">
    <div
      class="p-2 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center transition-all duration-300"
      class:justify-center={collapsed && !canHoverExpand}
    >
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0" transition:fade>
        {$user?.name?.[0] ?? 'U'}
      </div>
      <div class="ml-3 min-w-0 transition-all duration-300 overflow-hidden" 
           class:w-0={collapsed && !canHoverExpand} 
           class:opacity-0={collapsed && !canHoverExpand}
           class:w-full={!collapsed || canHoverExpand}>
        <p class="text-sm font-bold truncate" transition:fade>{$user?.name ?? 'Guest User'}</p>
        <p class="text-[10px] text-gray-400 font-bold uppercase truncate" transition:fade>{$user?.sacco ?? 'Personal'}</p>
      </div>
    </div>
  </div>
</aside>

<!-- Mobile Drawer -->
{#if showDrawer}
  <div class="fixed inset-0 z-40 md:hidden">
    <button type="button" class="absolute inset-0 bg-black/60 backdrop-blur-sm" on:click={toggleDrawer} aria-label="Close menu"></button>
    <div bind:this={drawerEl} role="dialog" aria-modal="true" aria-label="Main menu" class="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col p-4 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold">Menu</h2>
        <button class="p-2 rounded" on:click={toggleDrawer} aria-label="Close menu">✕</button>
      </div>
      <nav class="space-y-2">
        {#each $visibleMenu as item}
          <a href={item.href} on:click={toggleDrawer} class="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <span class="text-lg">{item.icon}</span>
            <span class="truncate">{item.label}</span>
          </a>
        {/each}
      </nav>
      <div class="mt-6 p-3 border-t flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold" transition:fade>
          {$user?.name?.[0] ?? 'U'}
        </div>
        <div>
          <div class="font-semibold" transition:fade>{$user?.name ?? 'Guest User'}</div>
          <div class="text-xs text-gray-500" transition:fade>{$user?.sacco ?? 'Personal'}</div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  aside { width: 17rem; }
  aside.collapsed { width: 5rem; }

  aside.group:hover {
    width: 17rem;
    box-shadow: 20px 0 25px -5px rgba(0, 0, 0, 0.05), 10px 0 10px -5px rgba(0, 0, 0, 0.02);
  }

  a { -webkit-tap-highlight-color: transparent; }
  @media (max-width: 767px) { aside { display: none; } }
</style>