<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore, ROLES } from '$lib/auth';  // assuming you renamed userStore → authStore consistently

  // ── Runes ────────────────────────────────────────────────────────────────

  // Reactive derived values (safe in SSR — optional chaining handles undefined)
  let isPassenger = $derived($authStore?.role === ROLES.PASSENGER);

  let isBusiness = $derived(
    [ROLES.OWNER, ROLES.ORGANIZATION, ROLES.ADMIN, ROLES.DRIVER].includes(
      $authStore?.role as any
    )
  );

  // Items will be plain let — we update it in $effect (side-effect)
  let items: (PassengerItem | BusinessItem)[] = $state([]);

  // Update items reactively when isPassenger / isBusiness changes
  $effect(() => {
    items = isPassenger ? passengerItems : businessItems;
  });

  // Types (unchanged)
  type PassengerItem = {
    id: string;
    route: string;
    sacco: string;
    eta: string;
    stage: string;
    status: string;
    capacity: string;
    pricePerSeat: number;
  };

  type BusinessItem = {
    reg: string;
    driver: string;
    fuel: string;
    status: string;
    revenue: string;
  };

  // Example data (unchanged)
  const passengerItems: PassengerItem[] = [
    { id: 'matatu-001', route: '111', sacco: 'SUPERMETRO', eta: '3 min', stage: 'T-Mall', status: 'Approaching', capacity: '14', pricePerSeat: 20 },
    { id: 'matatu-002', route: '125', sacco: 'NICCO', eta: '7 min', stage: 'CBD', status: 'On Route', capacity: '16', pricePerSeat: 25 }
  ];

  const businessItems: BusinessItem[] = [
    { reg: 'KAA 123B', driver: 'Peter K.', fuel: '78%', status: 'Active', revenue: 'KES 4,200' }
  ];

  // Navigate function (unchanged, but typed guard)
  function goToReserve(matatu: PassengerItem) {
    goto(`/reserve/${matatu.id}`, { replaceState: false });
  }
</script>

<div class="flex-1 p-6 md:p-10 bg-gray-50 min-h-screen">
  <header class="mb-12">
    <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
      {isPassenger ? 'Live Near You' : 'Operations Overview'}
    </h1>
    <p class="mt-2 text-lg text-gray-600 font-medium">
      {isPassenger
        ? 'Real-time matatu arrivals & routes for your commute'
        : 'Monitor fleet performance, active vehicles & key metrics'}
    </p>
  </header>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {#each items as item (item.id ?? item.reg)}
      <div
        class="bg-white rounded-3xl p-6 shadow border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-blue-600">
              {isPassenger ? `Route ${(item as PassengerItem).route}` : (item as BusinessItem).reg}
            </span>
            <h3 class="text-xl font-bold mt-1 text-gray-900">
              {isPassenger ? (item as PassengerItem).sacco : (item as BusinessItem).driver}
            </h3>
          </div>
        </div>

        <div class="bg-gray-50 rounded-2xl p-5 mb-6 space-y-2">
          {#if isPassenger}
            <p class="text-sm font-semibold">
              Next stop: <span class="text-green-700">{(item as PassengerItem).stage}</span>
            </p>
            <p class="text-2xl font-black text-blue-700">{(item as PassengerItem).eta}</p>
          {:else}
            <p class="text-sm font-semibold">
              Driver: <span class="text-gray-900">{(item as BusinessItem).driver}</span>
            </p>
            <p class="text-sm">
              Fuel: <span class="font-bold">{(item as BusinessItem).fuel}</span> • Revenue:
              <span class="font-bold text-green-700">{(item as BusinessItem).revenue}</span>
            </p>
          {/if}
        </div>

        {#if isPassenger}
          <button
            class="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg group-hover:bg-blue-600 transition-colors duration-200"
            on:click={() => goToReserve(item as PassengerItem)}
          >
            Reserve This Matatu
          </button>
        {:else}
          <button
            class="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg group-hover:bg-blue-600 transition-colors duration-200"
          >
            View Details
          </button>
        {/if}
      </div>
    {/each}
  </div>
<a
  href={`/feed/corridor/${polylineHash}`}
          class="cta-button inline-flex items-center px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xl md:text-2xl font-semibold rounded-full shadow-2xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95"
>
  View Corridor Feed
</a>
  {#if !items.length}
    <div class="text-center py-20 text-gray-500">
      <p class="text-2xl font-bold">
        No active {isPassenger ? 'vehicles near you' : 'fleet items'} right now
      </p>
    </div>
  {/if}
</div>