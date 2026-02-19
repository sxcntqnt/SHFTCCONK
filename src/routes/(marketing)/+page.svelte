<script lang="ts">
  import {
    WebsiteName,
    WebsiteBaseUrl,
    WebsiteDescription,
  } from "./../../config"
  import type {
    MatatuPartner,
    Testimonial,
    PlatformCapability,
    CommuterWorkflow,
    PlatformActor,
    IconKey,
  } from "./../../lib/types"

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: WebsiteName,
    url: WebsiteBaseUrl,
  }
  const jsonldScript = `<script type="application/ld+json">${JSON.stringify(ldJson) + "<"}/script>`

  /* icon registry — avoids storing components inside data */
  const SewingPinIcon = "marker.png"
  const LineChartIcon = "line-chart.svg"
  const BellIcon = "star.png"
  const BarChart3Icon =  "point.png"

  const ICONS: Record<IconKey, string> = {
    tracking: SewingPinIcon,
    routes: LineChartIcon,
    notifications: BellIcon,
    analytics: BarChart3Icon,
  }

  /* =========================
     PARTNER SACCOS
     ========================= */
  type MatatuPartner = { name: string; logo: string }
  export const MATATU_PARTNERS: readonly MatatuPartner[] = [
    { name: "SUPERMETRO", logo: "vehicles/ptrns/super-metro.svg" }, 
    { name: "NICCO", logo: "vehicles/ptrns/nicco-sacco.svg" }, 
    { name: "RONGAO", logo: "vehicles/ptrns/rongao-sacco.svg" }, 
    { name: "BURUSACCO", logo: "vehicles/ptrns/buru-sacco.svg" }, 
    { name: "UMOINNER", logo: "vehicles/ptrns/umoinner.svg" }, 
    { name: "FORWARD", logo: "vehicles/ptrns/forward-sacco.svg" }, 
  ]

  /* =========================
     PLATFORM PURPOSE
     ========================= */
  export const PLATFORM_PILLARS = [
    {
      title: "Predictable Public Transport",
      description:
        "Passengers know exactly where a matatu is and when it will arrive, eliminating uncertainty and roadside waiting.",
      illustration: "vehicles/pillars/predictability.png", 

    },
    {
      title: "Operational Intelligence for Saccos",
      description:
        "Fleet owners monitor vehicle movement, compliance, utilization, and performance in real time.",
      illustration: "vehicles/pillars/operations.png", 

    },
    {
      title: "Urban Mobility Data Layer",
      description:
        "Aggregated transport telemetry enables smarter routing, congestion awareness, and planning insights.",
      illustration: "vehicles/pillars/city-data.png", 

    },
  ] as const

  /* =========================
     PLATFORM CAPABILITIES
     ========================= */
  export const PLATFORM_CAPABILITIES: readonly PlatformCapability[] = [
    {
      name: "Live Vehicle Telemetry",
      description:
        "Continuous GPS streaming from installed trackers provides second-level vehicle position accuracy.",
      icon: "tracking",
      image: "vehicles/features/tracking.png", 

      audience: ["Commuter", "Operator"],
    },
    {
      name: "Dynamic Route Intelligence",
      description:
        "Routes adapt using congestion patterns and historical trip duration modeling.",
      icon: "routes",
      image: "vehicles/features/routes.png", 

      audience: ["Commuter", "Operator", "Planner"],
    },
    {
      name: "Passenger Event Alerts",
      description:
        "Arrival prediction, delays, diversions, and approaching vehicle notifications.",
      icon: "notifications",
      image: "vehicles/features/notifications.png", 

      audience: ["Commuter"],
    },
    {
      name: "Fleet Performance Analytics",
      description:
        "Trip cycles, idle time detection, load balancing, and revenue opportunity identification.",
      icon: "analytics",
      image: "vehicles/features/analytics.png", 

      audience: ["Operator", "Sacco"],
    },
  ]

  /* =========================
     PLATFORM ACTORS
     ========================= */
  export const PLATFORM_ACTORS: readonly PlatformActor[] = [
    {
      role: "Commuters",
      goal: "Reach destinations with minimal uncertainty and waiting time.",
      benefits: [
        "Live arrival prediction",
        "Best route recommendations",
        "Delay notifications",
      ],
      icon: "vehicles/actors/commuter.png", 

    },
    {
      role: "Drivers & Operators",
      goal: "Maximize trips while reducing empty mileage.",
      benefits: [
        "Demand heatmaps",
        "Route adherence monitoring",
        "Operational alerts",
      ],
      icon: "vehicles/actors/operator.png", 

    },
    {
      role: "Saccos & Fleet Owners",
      goal: "Improve profitability and remotely manage vehicles.",
      benefits: [
        "Fleet analytics dashboard",
        "Driver behavior monitoring",
        "Revenue optimization insights",
      ],
      icon: "vehicles/actors/sacco.png", 

    },
  ]

  /* =========================
     COMMUTER WORKFLOWS
     ========================= */
  export const COMMUTER_WORKFLOWS: readonly CommuterWorkflow[] = [
    {
      icon: "tracking",
      title: "Locate a Matatu",
      description:
        "Select a route and instantly see nearby vehicles approaching your stage.",
      link: "/app/dashboard",
    },
    {
      icon: "routes",
      title: "Choose the Fastest Trip",
      description: "Compare ETAs across routes and avoid congestion delays.",
      link: "/routes",
    },
    {
      icon: "notifications",
      title: "Receive Arrival Alerts",
      description: "Get notified when your vehicle is approaching your stop.",
      link: "/notifications",
    },
  ]

  /* =========================
     TESTIMONIALS
     ========================= */
  export const TESTIMONIALS: readonly Testimonial[] = [
    {
      name: "John Mwangi",
      userType: "Commuter",
      testimony:
        "I no longer wait blindly at the stage. I leave only when the matatu is close.",
      rating: 5,
    },
    {
      name: "Grace Wanjiku",
      userType: "Operator",
      testimony:
        "We can now see delays immediately and redirect vehicles accordingly.",
      rating: 4,
    },
    {
      name: "Peter Kamau",
      userType: "Commuter",
      testimony: "Arrival prediction completely changed my morning routine.",
      rating: 5,
    },
    {
      name: "Mary Achieng",
      userType: "Commuter",
      testimony: "Notifications help me plan transfers without stress.",
      rating: 4,
    },
    {
      name: "David Otieno",
      userType: "Fleet Owner",
      testimony: "We identified idle vehicles and increased daily trips.",
      rating: 5,
    },
    {
      name: "Sarah Njeri",
      userType: "Commuter",
      testimony: "Fastest route suggestions save me a lot of time every week.",
      rating: 4,
    },
    {
      name: "James Njoroge",
      userType: "Commuter",
      testimony: "The system makes commuting predictable for the first time.",
      rating: 5,
    },
    {
      name: "Esther Muthoni",
      userType: "Operator",
      testimony: "Passengers complain less because they already know delays.",
      rating: 4,
    },
    {
      name: "Michael Omondi",
      userType: "Commuter",
      testimony: "Finally public transport behaves like a modern system.",
      rating: 5,
    },
  ]

  // Helper: strongest testimonials for early trust block
  const featuredTestimonials: readonly Testimonial[] = TESTIMONIALS.filter((t) => t.rating === 5).slice(0, 5)
  const featuredTestimonialsList: readonly Testimonial[] = featuredTestimonials

  const partners: readonly MatatuPartner[] = MATATU_PARTNERS
  const commuterWorkflows: readonly CommuterWorkflow[] = COMMUTER_WORKFLOWS
  const platformCapabilities: readonly PlatformCapability[] = PLATFORM_CAPABILITIES
</script>

<svelte:head>
  <title>{WebsiteName} – Never Wait Again</title>
  <meta
    name="description"
    content="Live matatu tracking in Nairobi. See real-time positions, accurate ETAs and get 2–3 min arrival alerts. Free for commuters."
  />
  {@html jsonldScript}
</svelte:head>

<!-- HERO -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden">

  <!-- Background Video -->
  <video
    autoplay
    muted
    loop
    playsinline
    class="absolute inset-0 w-full h-full object-cover"
  >
    <source src="/vehicles/custom/GenjeSana.mp4" type="video/mp4" />
  </video>

  <!-- Dark Overlay (IMPORTANT for text contrast) -->
  <div class="absolute inset-0 bg-black/60"></div>

  <!-- Hero Content -->
  <div class="relative z-10 text-center px-6 py-20 md:py-32 max-w-5xl mx-auto text-white">

    <h1 class="text-5xl sm:text-6xl md:text-7xl font-black leading-tight mb-6">
      Never Wait Blindly at the Stage Again
    </h1>

    <p class="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90">
      See exactly where your matatu is right now — get precise ETAs and alerts
      when it's 2–3 minutes away.
    </p>

    <div class="flex flex-col sm:flex-row gap-5 justify-center">
      <a
        href=''
        class="btn btn-primary btn-xl lg:btn-2xl font-bold uppercase tracking-wide shadow-2xl"
      >
        Get the App – Free
      </a>
      <a href='' class="btn btn-outline btn-lg lg:btn-xl text-white border-white">
        Try Live Web Tracker →
      </a>
    </div>

    <p class="mt-8 text-sm opacity-80">
      Already helping thousands of Nairobi commuters save time every day
    </p>

  </div>
</section>

<!-- TRUST BLOCK – partners + top testimonials -->
<section class="py-16 bg-base-200">
  <div class="max-w-6xl mx-auto px-6 text-center">
    <p class="text-lg font-semibold mb-8 opacity-80">
      Trusted by Nairobi's leading matatu saccos and thousands of daily riders
    </p>

    <div
      class="flex flex-wrap gap-10 md:gap-16 justify-center items-center mb-16"
    >
      {#each partners as p}
        <img
          src={p.logo}
          alt={p.name}
          class="h-12 md:h-16 opacity-80 hover:opacity-100 transition"
        />
      {/each}
    </div>

    <h2 class="text-3xl md:text-4xl font-bold mb-10">Real Commuters Love It</h2>

    <div class="grid md:grid-cols-3 gap-8">
      {#each featuredTestimonials as t}
        <div class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <div class="flex gap-1 mb-3">
              {#each Array(t.rating) as _}
                <span class="text-yellow-400 text-xl">★</span>
              {/each}
            </div>
            <p class="italic text-lg">“{t.testimony}”</p>
            <div class="mt-4 font-semibold">{t.name}</div>
            <div class="text-sm opacity-70">{t.userType}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- COMMUTER WORKFLOWS -->
<section class="py-20">
  <div class="max-w-6xl mx-auto px-6 text-center">
    <h2 class="text-4xl md:text-5xl font-bold mb-14">
      Get Where You're Going Faster
    </h2>

    <div class="grid md:grid-cols-3 gap-10">
      {#each commuterWorkflows as step}
        {@const Icon = ICONS[step.icon]}
        <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition">
          <div class="card-body items-center text-center">
            {#if typeof Icon === "string"}
              <img src={Icon} alt={step.title + " icon"} class="w-16 h-16 mb-6" />
            {:else}
              <Icon class="w-16 h-16 text-primary mb-6" />
            {/if}
            <h3 class="text-2xl font-bold mb-4">{step.title}</h3>
            <p class="text-lg opacity-80">{step.description}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-16">
      <a
        href="/download"
        class="btn btn-primary btn-xl uppercase tracking-wide shadow-xl"
      >
        Start Tracking Now – It's Free
      </a>
    </div>
  </div>
</section>

<!-- KEY FEATURES (commuter-focused) -->
<section class="py-20 bg-base-200">
  <div class="max-w-6xl mx-auto px-6">
    <h2 class="text-4xl md:text-5xl font-bold text-center mb-14">
      Built for Everyday Commuters
    </h2>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each platformCapabilities.filter((f) => f.audience.includes("Commuter")) as feature}
        {@const Icon = ICONS[feature.icon]}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            {#if typeof Icon === "string"}
              <img src={Icon} alt={feature.name + " icon"} class="w-14 h-14 mb-4" />
            {:else}
              <Icon class="w-14 h-14 text-primary mb-4" />
            {/if}
            <h3 class="text-xl font-bold mb-3">{feature.name}</h3>
            <p class="opacity-80">{feature.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- SECONDARY CTA – operators/saccos -->
<section class="py-20 border-t">
  <div class="max-w-4xl mx-auto px-6 text-center">
    <h2 class="text-3xl md:text-4xl font-bold mb-6">
      Running a Sacco or Fleet?
    </h2>
    <p class="text-xl mb-10 opacity-80">
      Get real-time tracking, analytics, delay alerts and route optimization
      tools.
    </p>
    <a href="/operator-demo" class="btn btn-secondary btn-lg">
      Request a Demo →
    </a>
  </div>
</section>

<!-- FINAL CTA -->
<section class="py-16 bg-primary text-primary-content text-center">
  <div class="max-w-4xl mx-auto px-6">
    <h2 class="text-3xl md:text-4xl font-bold mb-6">
      Ready to Stop Guessing When Your Matatu Arrives?
    </h2>
    <p class="text-xl mb-8">
      Download the app today — make every commute predictable.
    </p>
    <a
      href="/download"
      class="btn btn-secondary btn-xl uppercase tracking-wider shadow-2xl"
    >
      Get the App Free
    </a>
  </div>
</section>
