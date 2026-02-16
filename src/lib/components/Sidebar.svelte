<!-- Script moved down; mobile drawer and desktop aside share same menu config and logic -->

<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { user, ROLES } from '$lib/auth'
  import { derived } from 'svelte/store'
  let showDrawer = false
  const toggle = () => showDrawer = !showDrawer

  const MENU_CONFIG = [
    { id: 'dashboard', href: '/app/dashboard', label: 'Home', icon: '🏠', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'routes', href: '/app/routes', label: 'Live Routes', icon: '🚌', roles: [ROLES.PASSENGER, ROLES.PLANNER, ROLES.REGULATOR] },
    { id: 'telemetry', href: '/app/sync', label: 'Telemetry Sync', icon: '📡', roles: [ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.OWNER] },
    { id: 'fleet', href: '/app/fleet', label: 'Fleet Manager', icon: '📊', roles: [ROLES.OWNER, ROLES.ORGANIZATION] },
    { id: 'admin-panel', href: '/admin/actor_requests', label: 'Admin Panel', icon: '🛠️', roles: [ROLES.ADMIN, ROLES.ORGANIZATION] },
    { id: 'settings', href: '/app/settings', label: 'Settings', icon: '⚙️', roles: ['*'] }
  ]

  const visibleMenu = derived(user, $user => {
    return MENU_CONFIG.filter(item => item.roles.includes('*') || item.roles.includes($user.role))
  })
</script>

<!-- Mobile header button -->
<div class="md:hidden flex items-center justify-between p-4 border-b bg-white">
  <h1 class="text-lg font-bold">MATATU OS</h1>
  <button aria-label="Open menu" class="p-2 rounded-md bg-gray-100" on:click={toggle}>
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
  </button>
</div>

<!-- Desktop aside -->
<aside class="w-72 bg-gradient-to-b from-[#f8f9fa] to-[#f0f2f5] border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto hidden md:flex">

  <div class="p-6 border-b border-gray-200">
    <h1 class="text-3xl font-black tracking-tight text-[#0a0a0a]">MATATU OS</h1>
    <div class="flex items-center gap-2 mt-2">
      <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse ring-2 ring-green-200"></span>
      <span class="text-xs font-bold uppercase tracking-widest text-gray-500">{ $user.role } MODE</span>
    </div>
  </div>

  <nav class="flex-1 p-4 space-y-1.5">
    {#if $visibleMenu.length === 0}
      <div class="text-sm text-gray-500">No menu items available.</div>
    {:else}
      {#each $visibleMenu as item}
        <a href={item.href} class="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-[#1a1a1a] hover:bg-white hover:shadow-md transition-all duration-200 active:scale-98 group">
          <span class="text-xl opacity-80 group-hover:opacity-100 transition">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    {/if}
  </nav>

  <div class="m-4 p-4 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center gap-3">
    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow">
      { $user.name ? $user.name[0] : 'U' }
    </div>
    <div class="min-w-0">
      <p class="font-bold truncate">{ $user.name }</p>
      <p class="text-xs text-gray-500 font-medium truncate">{ $user.sacco || 'Personal' }</p>
    </div>
  </div>

</aside>

<!-- Mobile drawer -->
{#if showDrawer}
  <div class="fixed inset-0 z-40">
    <button type="button" class="absolute inset-0 bg-black/40 p-0 m-0 border-0 cursor-pointer focus:outline-none" on:click={toggle} aria-label="Close menu"></button>
    <div class="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold">Menu</h2>
        <button class="p-2 rounded" on:click={toggle} aria-label="Close menu">✕</button>
      </div>
      <nav class="space-y-2">
        {#each $visibleMenu as item}
          <a href={item.href} on:click={toggle} class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100">{item.icon} {item.label}</a>
        {/each}
      </nav>
      <div class="mt-6 p-3 border-t">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">{ $user.name ? $user.name[0] : 'U' }</div>
          <div>
            <div class="font-semibold">{ $user.name }</div>
            <div class="text-xs text-gray-500">{ $user.sacco || 'Personal' }</div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  aside { min-height: 100vh; }
  @media (max-width: 767px) { aside { display: none; } }
</style>
