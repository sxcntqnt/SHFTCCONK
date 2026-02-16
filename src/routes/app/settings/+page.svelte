<script lang="ts">
  import { user, ROLES } from '$lib/auth'

  let notificationRange = 5 // passenger default mins
  let revenueTarget = 15000 // business default KES
  $: isPassenger = $user.role === ROLES.PASSENGER
</script>

<div class="flex-1 p-6 md:p-10 bg-gray-50 min-h-screen">
  <header class="mb-12">
    <h1 class="text-4xl font-black tracking-tight text-gray-900">Preferences & Rules</h1>
    <p class="mt-2 text-lg text-gray-600">Customize your experience based on your role</p>
  </header>

  <div class="max-w-3xl mx-auto bg-white rounded-3xl p-10 shadow border border-gray-100">
    <h2 class="text-2xl font-black mb-8 border-b pb-4">{$user.role === ROLES.PASSENGER ? 'Commute Notifications' : 'Business Operations'}</h2>

    <div class="space-y-10">
      {#if isPassenger}
        <div>
          <label for="notificationRange" class="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Alert me when matatu is within</label>
          <input id="notificationRange" type="range" min="1" max="15" bind:value={notificationRange} class="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          <div class="flex justify-between text-sm font-bold mt-3 text-gray-700">
            <span>1 min</span>
            <span class="text-blue-600 font-black">{notificationRange} mins</span>
            <span>15 mins</span>
          </div>
        </div>
        <div class="pt-8 border-t">
          <button class="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition">Save Commute Settings</button>
        </div>
      {:else}
        <div>
          <label for="revenueTarget" class="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Daily Revenue Target (KES)</label>
          <input id="revenueTarget" type="number" bind:value={revenueTarget} placeholder="15000" class="w-full p-5 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none text-xl font-bold" />
        </div>
        <div class="pt-8 border-t">
          <button class="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition">Update Business Rules</button>
        </div>
      {/if}
    </div>
  </div>
</div>
