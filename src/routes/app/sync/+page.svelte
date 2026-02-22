<script lang="ts">
  import { authStore, ROLES } from '$lib/features/auth/stores/auth'

  const allowedRoles = [ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.OWNER]
  $: hasAccess = allowedRoles.includes($authStore.role as any)
</script>

<div class="flex-1 p-6 md:p-10 bg-gray-50 min-h-screen">
  {#if !hasAccess}
    <div class="max-w-lg mx-auto mt-20 text-center bg-white rounded-3xl p-12 shadow-lg border border-gray-100">
      <span class="text-7xl block mb-6">🔒</span>
      <h2 class="text-3xl font-black mb-4 text-gray-900">Access Restricted</h2>
      <p class="text-lg text-gray-600">Telemetry sync tools are available only to Organization Admins, Owners, or Super Admins.</p>
      <p class="mt-4 text-sm text-gray-500">Contact your sacco admin or upgrade your role.</p>
    </div>
  {:else}
    <header class="mb-12">
      <h1 class="text-4xl font-black tracking-tight text-gray-900">Telemetry Discovery</h1>
      <p class="mt-2 text-lg text-gray-600">Scan & sync GPS trackers across your fleet</p>
    </header>

    <div class="flex justify-between mb-12 max-w-3xl mx-auto">
      {#each ['Connect Device', 'Handshake', 'Stream Data'] as step, i}
        <div class="flex-1 text-center relative">
          <div class="w-14 h-14 mx-auto rounded-full {i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'} flex items-center justify-center font-black text-xl mb-3 shadow">{i + 1}</div>
          <p class="text-sm font-bold uppercase tracking-wider text-gray-600">{step}</p>
          {#if i < 2}
            <div class="absolute top-7 left-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="bg-white rounded-3xl p-10 shadow border border-gray-100 max-w-4xl mx-auto">
      <div class="grid md:grid-cols-2 gap-8 mb-10">
        <div class="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-600 cursor-pointer hover:scale-[1.02] transition">
          <h3 class="font-black text-xl mb-2">Onboard IoT Scan</h3>
          <p class="text-gray-700">Automatically discover & connect installed GPS trackers</p>
        </div>

        <div class="p-8 bg-gray-50 rounded-3xl border-2 border-transparent opacity-60 cursor-not-allowed">
          <h3 class="font-black text-xl mb-2">Sacco API Pull</h3>
          <p class="text-gray-500">Integrate with existing sacco servers (coming soon)</p>
        </div>
      </div>

      <button class="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-blue-700 hover:scale-[1.02] transition-all duration-300">Start Discovery Engine</button>
    </div>
  {/if}
</div>
