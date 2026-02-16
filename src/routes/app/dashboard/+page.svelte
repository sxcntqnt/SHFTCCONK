<script lang="ts">
  import { user, ROLES } from '$lib/auth'

  // derived role flags
  $: isPassenger = $user.role === ROLES.PASSENGER
  $: isBusiness = [ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.DRIVER].includes($user.role as any)

  // Mock data – in real app, fetch based on role/sacco
  type PassengerItem = { route: string; sacco: string; eta: string; stage: string; status: string }
  type BusinessItem = { reg: string; driver: string; fuel: string; status: string; revenue: string }

  const passengerItems: PassengerItem[] = [
    { route: '111', sacco: 'SUPERMETRO', eta: '3 min', stage: 'T-Mall', status: 'Approaching' },
    { route: '125', sacco: 'NICCO', eta: '7 min', stage: 'CBD', status: 'On Route' }
  ]

  const businessItems: BusinessItem[] = [
    { reg: 'KAA 123B', driver: 'Peter K.', fuel: '78%', status: 'Active', revenue: 'KES 4,200' }
  ]

  let items: (PassengerItem | BusinessItem)[] = []
  $: items = isPassenger ? passengerItems : businessItems
</script>

<div class="flex-1 p-6 md:p-10 bg-gray-50 min-h-screen">

  <header class="mb-12">
    <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900">{isPassenger ? 'Live Near You' : 'Operations Overview'}</h1>
    <p class="mt-2 text-lg text-gray-600 font-medium">{isPassenger ? 'Real-time matatu arrivals & routes for your commute' : 'Monitor fleet performance, active vehicles & key metrics'}</p>
  </header>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {#each items as item}
      <div class="bg-white rounded-3xl p-6 shadow border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-blue-600">{isPassenger ? `Route ${(item as PassengerItem).route}` : (item as BusinessItem).reg}</span>
            <h3 class="text-xl font-bold mt-1 text-gray-900">{isPassenger ? (item as PassengerItem).sacco : (item as BusinessItem).driver}</h3>
          </div>
        </div>

        <div class="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2">
          {#if isPassenger}
            <p class="text-sm font-semibold">Next stop: <span class="text-green-700">{(item as PassengerItem).stage}</span></p>
            <p class="text-2xl font-black text-blue-700">{(item as PassengerItem).eta}</p>
          {:else}
            <p class="text-sm font-semibold">Driver: <span class="text-gray-900">{(item as BusinessItem).driver}</span></p>
            <p class="text-sm">Fuel: <span class="font-bold">{(item as BusinessItem).fuel}</span> • Revenue: <span class="font-bold text-green-700">{(item as BusinessItem).revenue}</span></p>
          {/if}
        </div>

        <button class="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg group-hover:bg-blue-600 transition-colors duration-200">{isPassenger ? 'Track This Matatu' : 'View Details'}</button>
      </div>
    {/each}
  </div>

  {#if !items.length}
    <div class="text-center py-20 text-gray-500">
      <p class="text-2xl font-bold">No active {isPassenger ? 'vehicles near you' : 'fleet items'} right now</p>
    </div>
  {/if}

</div>
