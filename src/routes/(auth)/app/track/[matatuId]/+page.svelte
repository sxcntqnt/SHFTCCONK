<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { writable, get } from "svelte/store"
  import MapView from "$lib/map/components/MapView.svelte"
  import gsap from "gsap"

  type MatatuData = {
    matatuId: string
    hex: string
    lat: number
    lng: number
    k: number
  }

  type ReservedMatatu = {
    matatuId: string
    saccoName: string
    routeNumber: string
    routePolyline: { lat: number; lng: number }[]
  }

  let {
    data,
    reservedMatatus = [],
  }: {
    data: MatatuData
    reservedMatatus?: ReservedMatatu[]
  } = $props()

  type FleetMarker = {
    id: string
    label: string
    coords: { lat: number; lng: number }
    iconUrl: string
    currentIndex: number
  }

  let markers = writable<FleetMarker[]>([])

  const K = 0.5
  function kalmanUpdate(
    pos: { lat: number; lng: number },
    estimate: { lat: number; lng: number },
  ) {
    return {
      lat: estimate.lat + K * (pos.lat - estimate.lat),
      lng: estimate.lng + K * (pos.lng - estimate.lng),
    }
  }

  function animateAlongRoute(
    marker: FleetMarker,
    route: { lat: number; lng: number }[],
  ) {
    if (!route.length) return
    const nextIndex = (marker.currentIndex + 1) % route.length
    const end = route[nextIndex]

    gsap.to(marker.coords, {
      lat: end.lat,
      lng: end.lng,
      duration: 4.5,
      ease: "power1.inOut",
      onUpdate: () => {
        markers.update((list) =>
          list.map((m) => (m.id === marker.id ? { ...m } : m)),
        )
      },
      onComplete: () => {
        marker.currentIndex = nextIndex
        animateAlongRoute(marker, route)
      },
    })
  }

  async function fetchLivePositions() {
    for (let m of reservedMatatus) {
      try {
        const res = await fetch(`/api/matatu/live/${m.matatuId}`)
        if (!res.ok) continue
        const data = await res.json()

        markers.update((list) => {
          let marker = list.find((x) => x.id === m.matatuId)
          if (!marker) {
            const startPos = m.routePolyline[0] || { lat: 1.2921, lng: 36.8219 }
            const newMarker: FleetMarker = {
              id: m.matatuId,
              label: `${m.saccoName} (${m.routeNumber})`,
              coords: startPos,
              iconUrl: "/icons/matatu.png",
              currentIndex: 0,
            }
            list.push(newMarker)
            animateAlongRoute(newMarker, m.routePolyline)
          } else {
            const smoothed = kalmanUpdate(data, marker.coords)
            marker.coords = smoothed
          }
          return list
        })
      } catch (err) {
        console.error(`Error fetching matatu ${m.matatuId} data`, err)
      }
    }
  }

  let interval: any
  onMount(() => {
    if (reservedMatatus.length > 0) {
      fetchLivePositions()
      interval = setInterval(fetchLivePositions, 5000)
    }
  })
  onDestroy(() => clearInterval(interval))

  let mapCenter = reservedMatatus[0]?.routePolyline[0] || {
    lat: 1.2921,
    lng: 36.8219,
  }
  let mapZoom = 15

  $: {
    const mList = get(markers)
    if (mList.length) {
      const lats = mList.map((m) => m.coords.lat)
      const lngs = mList.map((m) => m.coords.lng)
      const minLat = Math.min(...lats),
        maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs),
        maxLng = Math.max(...lngs)
      mapCenter = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }
      const latDiff = maxLat - minLat
      const lngDiff = maxLng - minLng
      const maxDiff = Math.max(latDiff, lngDiff)
      mapZoom =
        maxDiff < 0.001
          ? 17
          : maxDiff < 0.005
            ? 16
            : maxDiff < 0.01
              ? 15
              : maxDiff < 0.03
                ? 14
                : 13
    }
  }

  // ---------------- Empty state racing animation ----------------
  let raceContainer: HTMLElement
  let busTweens: gsap.core.Tween[] = []
  let ctaTween: gsap.core.Tween | null = null

  function startRacingAnimation() {
    stopRacingAnimation()
    if (!raceContainer) return

    gsap.fromTo(
      raceContainer,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" },
    )

    const buses = raceContainer.querySelectorAll<HTMLElement>(".bus-racer")
    const screenWidth = window.innerWidth

    buses.forEach((bus, i) => {
      gsap.set(bus, { x: -250, scale: 0.88 }) // medium size

      const tween = gsap.to(bus, {
        x: screenWidth + 250,
        duration: 8 + i * 1.2,
        ease: "none",
        repeat: -1,
        delay: i * 0.5,
        rotation: i % 2 === 0 ? 4 : -4,
        onRepeat: () => gsap.set(bus, { x: -250 }),
      })

      busTweens.push(tween)
    })

    ctaTween = gsap.to(".cta-button", {
      scale: 1.04,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    })
  }

  function stopRacingAnimation() {
    busTweens.forEach((t) => t.kill())
    busTweens = []

    ctaTween?.kill()
    ctaTween = null
  }

  $: {
    if (reservedMatatus.length === 0 && raceContainer) {
      startRacingAnimation()
    } else {
      stopRacingAnimation()
    }
  }

  onDestroy(() => stopRacingAnimation())
</script>

<div
  class="w-screen h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center overflow-hidden"
>
  {#if reservedMatatus.length > 0}
    <div class="w-full h-full flex flex-col items-center justify-center">
      <h1
        class="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4"
      >
        Live Tracking
      </h1>
      <p class="text-xl text-gray-600 mb-8 max-w-3xl">
        Your reserved matatus — watch them move in real time.
      </p>
      <div
        class="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-200/60 bg-white w-full h-[80%]"
      >
        <MapView
          markers={$markers}
          initialCenter={mapCenter}
          initialZoom={mapZoom}
        />
      </div>
    </div>
  {:else}
    <div
      bind:this={raceContainer}
      class="relative flex flex-col items-center justify-center w-full h-full text-center"
    >
      <!-- Buses at medium size -->
      <div class="bus-racer absolute top-[15%]">🚌</div>
      <div class="bus-racer absolute top-[35%]">🚌</div>
      <div class="bus-racer absolute top-[55%]">🚌</div>
      <div class="bus-racer absolute top-[75%]">🚌</div>

      <div class="relative z-10 max-w-2xl text-center">
        <h1
          class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-wide mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 drop-shadow-md"
        >
          They're Leaving Without You
        </h1>

        <p
          class="text-lg md:text-xl text-gray-700 font-medium italic mb-12 max-w-xl mx-auto leading-relaxed"
        >
          Reserve your seat now and join the ride. <span
            class="font-semibold text-indigo-600">Watch your matatu live</span
          > as it comes for you.
        </p>

        <a
          href={`/feed/h3/${hex}?k=${K}`}
          class="cta-button inline-flex items-center px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xl md:text-2xl font-semibold rounded-full shadow-2xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95"
        >
          Reserve My Seat Now
          <span class="ml-2 text-2xl">→</span>
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .bus-racer {
    will-change: transform;
    transform: translateZ(0);
    font-size: 2.5rem;
    filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.15));
    position: absolute;
  }
  .bus-racer.rotating {
    animation: busRotate 2s ease-in-out infinite alternate;
  }

  :global(*) {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
</style>
