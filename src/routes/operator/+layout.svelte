<script lang="ts">
  import { page } from "$app/state"
  import {
    Home,
    Car,
    Wallet,
    ShieldCheck,
    Map,
    AlertTriangle,
    Settings,
  } from "@lucide/svelte"
  import { authStore, hasPermission } from "$lib/features/auth/stores/auth"
  import Notification from "$lib/components/NotificationToast.svelte"
  import ErrorBoundary from "$lib/components/ErrorBoundary.svelte"
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import type { Role } from "$lib/features/auth/stores/auth"

  let role: Role
  let currentPath = ""

  authStore.subscribe((v) => (role = v.role))
  page.subscribe((p) => (currentPath = p.url.pathname))

  onMount(() => {
    if (!role) goto("/auth") // Redirect if not authenticated
  })

  const navItems = [
    {
      label: "Command Center",
      icon: Home,
      permission: "command",
      href: "/operator/command",
    },
    { label: "Fleet", icon: Car, permission: "fleet", href: "/operator/fleet" },
    {
      label: "Finance",
      icon: Wallet,
      permission: "finance",
      href: "/operator/finance",
    },
    {
      label: "Compliance",
      icon: ShieldCheck,
      permission: "compliance",
      href: "/operator/compliance",
    },
    {
      label: "Routes",
      icon: Map,
      permission: "routes",
      href: "/operator/routes",
    },
    {
      label: "Incidents",
      icon: AlertTriangle,
      permission: "incidents",
      href: "/operator/incidents",
    },
    {
      label: "Settings",
      icon: Settings,
      permission: "settings",
      href: "/operator/settings",
    },
  ]
</script>

<ErrorBoundary>
  <div class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] flex">
    <!-- Sidebar -->
    <aside
      class="w-72 bg-white/80 backdrop-blur-2xl border-r border-white/50 p-6 hidden lg:block"
    >
      <h1
        class="text-2xl font-bold mb-10 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
      >
        Mobility OS
      </h1>
      <nav class="space-y-4 text-sm font-medium">
        {#each navItems as item}
          {#if hasPermission(role, item.permission)}
            <a
              href={item.href}
              class="nav-item {currentPath.startsWith(item.href)
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : ''}"
            >
              <svelte:component this={item.icon} size={18} />
              {item.label}
            </a>
          {/if}
        {/each}
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-8 relative">
      <slot />
    </main>

    <Notification />
  </div>
</ErrorBoundary>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    transition: 0.2s ease;
    color: #1f2937; /* Default text */
    text-decoration: none;
  }

  .nav-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .nav-item.bg-blue-100 {
    background-color: #dbeafe; /* Tailwind blue-100 */
  }

  .nav-item.text-blue-700 {
    color: #1d4ed8; /* Tailwind blue-700 */
  }
</style>
