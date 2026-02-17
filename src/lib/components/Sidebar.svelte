<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { user, ROLES } from '$lib/auth'
  import { derived } from 'svelte/store'
  let showDrawer = false
  let menuButton: HTMLButtonElement | null = null
  let drawerEl: HTMLElement | null = null
  const toggle = () => showDrawer = !showDrawer

  // derived current path for active link checks
  const currentPath = derived(page, $page => $page.url.pathname)
  const isActive = (href: string, path: string) => path === href || path.startsWith(href + '/')

  const MENU_CONFIG = [
    { id: 'dashboard', href: '/app/dashboard', label: 'Home', icon: '🏠', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'routes', href: '/app/routes', label: 'Live Routes', icon: '🚌', roles: [ROLES.PASSENGER, ROLES.PLANNER, ROLES.REGULATOR] },
    { id: 'telemetry', href: '/app/sync', label: 'Telemetry Sync', icon: '📡', roles: [ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.OWNER] },
    { id: 'fleet', href: '/app/fleet', label: 'Fleet Manager', icon: '📊', roles: [ROLES.OWNER, ROLES.ORGANIZATION] },
    { id: 'reservations', href: '/reserve', label: 'Reservation', icon: '🎫', roles: [ROLES.PASSENGER, ROLES.ADMIN] },
    { id: 'race', href: '/race', label: 'Race Control', icon: '🏁', roles: [ROLES.PASSENGER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'chat', href: '/chat', label: 'Chat', icon: '💬', roles: [ROLES.PASSENGER, ROLES.DRIVER, ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN] },
    { id: 'admin-panel', href: '/admin/actor_requests', label: 'Admin Panel', icon: '🛠️', roles: [ROLES.ADMIN, ROLES.ORGANIZATION] },
    { id: 'settings', href: '/app/settings', label: 'Settings', icon: '⚙️', roles: ['*'] }
    
  ]

  const visibleMenu = derived(user, $user => {
    return MENU_CONFIG.filter(item => item.roles.includes('*') || item.roles.includes($user.role))
  })

  // body scroll lock, focus management & focus-trap for accessibility
  let focusTrapHandler: (e: KeyboardEvent) => void

  $: if (typeof document !== 'undefined') {
    if (showDrawer) {
      document.body.classList.add('overflow-hidden')
      // focus first focusable inside drawer
      setTimeout(() => {
        drawerEl?.querySelector<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')?.focus()
      }, 0)

      focusTrapHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        const focusables = drawerEl?.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? []
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
      document.addEventListener('keydown', focusTrapHandler)
    } else {
      document.body.classList.remove('overflow-hidden')
      if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler)
      // restore focus to the menu button when drawer closes
      setTimeout(() => menuButton?.focus(), 0)
    }
  }

  // close drawer on navigation and on Escape key
  onMount(() => {
    const unsub = page.subscribe(() => { if (showDrawer) showDrawer = false })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDrawer) {
        showDrawer = false
        menuButton?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      unsub()
      document.removeEventListener('keydown', onKey)
      if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler)
    }
  })
</script>

<!-- Mobile header button -->
  <div class="md:hidden flex items-center justify-between p-4 border-b bg-white">
  <h1 class="text-lg font-bold">MATATU OS</h1>
  <button aria-label="Open menu" bind:this={menuButton} class="p-2 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" on:click={toggle}>
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

  <nav class="flex-1 p-4 space-y-2" aria-label="Main navigation">
    {#if $visibleMenu.length === 0}
      <div class="text-sm text-gray-500">No menu items available.</div>
    {:else}
      {#each $visibleMenu as item}
          <a href={item.href}
            class="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-white hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-current={isActive(item.href, $currentPath) ? 'page' : undefined}>
            <span class="text-xl opacity-80">{item.icon}</span>
            <span class="truncate">{item.label}</span>
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
    <div bind:this={drawerEl} role="dialog" aria-modal="true" aria-label="Main menu" class="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold">Menu</h2>
        <button class="p-2 rounded" on:click={toggle} aria-label="Close menu">✕</button>
      </div>
      <nav class="space-y-2" aria-label="Mobile navigation">
        {#each $visibleMenu as item}
            <a href={item.href} on:click={toggle}
              class="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200">
              <span class="text-lg">{item.icon}</span>
              <span class="truncate">{item.label}</span>
            </a>
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
