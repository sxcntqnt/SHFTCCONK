export const blogInfo = {
  name: "Matatu Pulse Blog",
  description:
    "Insights on urban mobility, matatu operations, transit technology, and smarter commuting in Nairobi.",
}

export type BlogPost = {
  link: string
  date: string // 'YYYY-MM-DD'
  title: string
  /**
   * Shorter title for the <title> tag / SERP snippet.
   * `title` stays full-length for the on-page H1, blog cards, og:title,
   * twitter:title, and JSON-LD headline — those don't have a site-name
   * suffix appended and benefit from being descriptive. The <title> tag
   * in +layout.svelte renders as `{title} — Matatu Pulse`, and Google
   * truncates around ~60 characters total, so seoTitle is sized to
   * leave room for that " — Matatu Pulse" suffix (15 chars).
   * Falls back to `title` via getSeoTitle() if unset.
   */
  seoTitle?: string
  description: string
  category?: string
  author?: string
  parsedDate?: Date
}

// ─────────────────────────────────────────────
// POSTS
// Add new entries here — they auto-sort by date.
// Categories: "Product" | "Operations" | "City" | "Data" | "Guides"
// ─────────────────────────────────────────────
const blogPosts: BlogPost[] = [
  {
  title:
    "Where Is the Matatu Right Now? Inside the Matatu Pulse Live Tracking Map",
  seoTitle: "Live Matatu Tracking: Where Is It Now?",
  description:
    "Most commuters rely on guesswork to know when a matatu is coming. Our live tracking map replaces that with real-time GPS telemetry — showing exactly where vehicles are, how they’re moving, and what that means for your wait time.",
  link: "/blog/live-tracking-map",
  date: "2026-04-02",
  category: "Product",
  author: "Matatu Pulse Team",
},
{
  title:
    "Stop Waiting at the Stage: How Arrival Alerts Change the Matatu Experience",
  seoTitle: "Matatu Arrival Alerts: Stop Waiting Blindly",
  description:
    "Arrival Alerts notify you when your matatu is actually approaching — not based on schedules, but on live movement, congestion, and predictive ETA modelling. Here’s how it works and why it matters.",
  link: "/blog/arrival-alerts",
  date: "2026-04-01",
  category: "Product",
  author: "Matatu Pulse Team",
},
{
  title:
    "Choosing the Best Route in Real Time: Inside Matatu Pulse Route Intelligence",
  seoTitle: "Route Intelligence: Best Matatu Route, Live",
  description:
    "Not all routes perform the same at every hour. Route Intelligence scores congestion, reliability, and travel time using live and historical data — helping commuters choose the fastest option right now.",
  link: "/blog/route-intelligence",
  date: "2026-03-30",
  category: "Data",
  author: "Matatu Pulse Team",
},
{
  title:
    "From GPS Pings to Decisions: Inside the Matatu Pulse Analytics Dashboard",
  seoTitle: "Matatu Analytics Dashboard, Explained",
  description:
    "Operators generate massive amounts of vehicle data every day. Our analytics dashboard turns that raw telemetry into actionable insights — from congestion patterns to fleet performance and revenue opportunities.",
  link: "/blog/analytics-dashboard",
  date: "2026-03-29",
  category: "Product",
  author: "Matatu Pulse Team",
},
    {
    title:
      "Every Nairobi Matatu Route Number, Live: Introducing the Matatu Pulse Route Tracker",
    seoTitle: "Every Matatu Route Number, Tracked Live",
    description:
      "We indexed every active matatu route in our partner SACCO network — route numbers, pickup stages, full destination lists, and live vehicle counts — into a searchable real-time tracker. Here's what we built and why route numbers are the right unit of navigation.",
    link: "/blog/route-tracker",
    date: "2026-03-18",
    category: "Product",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "Nairobi Traffic Is More Predictable Than You Think: Inside Our Congestion Heatmap",
    seoTitle: "Nairobi's Congestion Heatmap, Explained",
    description:
      "Using a Bayesian Beta-Binomial model trained on H3 hex-zone route density and time-of-day congestion priors, our heatmap shows which parts of Nairobi are likely gridlocked right now — and why that probability is more useful than a colour on a road line.",
    link: "/blog/heatmap-analysis",
    date: "2026-02-27",
    category: "Data",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "How Real-Time Matatu Tracking Is Changing Nairobi's Morning Commute",
    seoTitle: "How Real-Time Tracking Changes Your Commute",
    description:
      "We analysed six months of GPS telemetry across 340 tracked vehicles. Here's what the data says about peak-hour congestion, route deviation, and why predictability is the single most valuable thing we can give a rider.",
    link: "/blog/real-time-tracking-nairobi-commute",
    date: "2025-09-15",
    category: "Data",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "Introducing Operator Dashboards: Fleet Intelligence for Every Sacco",
    seoTitle: "Operator Dashboards for Sacco Fleets",
    description:
      "Today we're launching a fully redesigned operator dashboard — live fleet maps, delay heatmaps, trip-cycle analytics, and driver behaviour reports, all in one place. Here's a complete walkthrough.",
    link: "/blog/operator-dashboards-launch",
    date: "2025-08-28",
    category: "Product",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "Why Matatu Saccos Lose Revenue on Empty Return Trips (And How to Fix It)",
    seoTitle: "Why Saccos Lose Money on Empty Return Trips",
    description:
      "Empty mileage is the silent profit killer in Nairobi's matatu ecosystem. Using route telemetry from our partner saccos, we quantify the problem and outline the demand-matching strategies that are already working.",
    link: "/blog/empty-return-trips-revenue",
    date: "2025-07-10",
    category: "Operations",
    author: "Matatu Pulse Team",
  },
  {
    title: "The State of Public Transit in Nairobi: 2025 Report",
    seoTitle: "State of Public Transit in Nairobi: 2025",
    description:
      "A comprehensive look at ridership trends, infrastructure gaps, NTSA compliance rates, and the technology adoption curve across Nairobi's informal transit network — with original data and operator interviews.",
    link: "/blog/nairobi-transit-state-2025",
    date: "2025-06-02",
    category: "City",
    author: "Matatu Pulse Team",
  },
  {
    title: "Route 46 Case Study: How Supermetro Reduced Peak Delays by 23%",
    seoTitle: "Route 46: How Supermetro Cut Delays 23%",
    description:
      "A deep-dive into our six-week pilot with Supermetro Sacco on Route 46 (CBD to Kangemi). What changed, what we measured, and what every other sacco can learn from it.",
    link: "/blog/supermetro-route-46-case-study",
    date: "2025-04-07",
    category: "Operations",
    author: "Matatu Pulse Team",
  },
  {
    title: "How to Read a Matatu Heatmap (And What It Means for Your Commute)",
    seoTitle: "How to Read a Matatu Heatmap",
    description:
      "Our demand heatmaps are one of the most-used features in the Matatu Pulse app. This guide explains exactly how to interpret them, when they update, and how to use them to pick the fastest boarding point.",
    link: "/blog/how-to-read-matatu-heatmap",
    date: "2025-03-22",
    category: "Guides",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "GPS Tracker Hardware: What We Evaluated Before Choosing Our Fleet Device",
    seoTitle: "GPS Tracker Hardware: How We Chose Ours",
    description:
      "We tested seven GPS tracker models over four months across Nairobi road conditions. Battery life, signal dropout in the CBD, tamper resistance, and cost-per-unit — here's the full breakdown.",
    link: "/blog/gps-tracker-hardware-evaluation",
    date: "2025-02-14",
    category: "Data",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "NTSA Compliance Made Easier: How Digitisation Helps Sacco Managers Stay Ahead",
    seoTitle: "Digital Fleet Records Ease NTSA Compliance",
    description:
      "Regulatory overhead is one of the biggest pain points for matatu operators. We spoke to sacco managers about what compliance actually costs them — and how digital fleet records are cutting that burden.",
    link: "/blog/ntsa-compliance-digital-fleet",
    date: "2025-01-30",
    category: "Operations",
    author: "Matatu Pulse Team",
  },

  // ── 2024 ──
  {
    title: "Nairobi's Traffic Blackspots: Data From 10 Million GPS Points",
    seoTitle: "Nairobi's Traffic Blackspots, Mapped",
    description:
      "After aggregating a year of anonymised telemetry across 200+ vehicles, we mapped Nairobi's worst recurring congestion points by hour, day, and season. The results will surprise regular commuters.",
    link: "/blog/nairobi-traffic-blackspots-data",
    date: "2024-12-05",
    category: "City",
    author: "Matatu Pulse Team",
  },
  {
    title: "Building for Low-Bandwidth: How We Keep the App Fast on 3G",
    seoTitle: "Building a Fast Matatu App for 3G",
    description:
      "Most Nairobians commute on 3G or patchy LTE. Every product decision we make is stress-tested against a slow connection. This post walks through our data-compression strategy, tile caching, and offline-first architecture.",
    link: "/blog/low-bandwidth-app-architecture",
    date: "2024-10-18",
    category: "Product",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "From Chaos to Clockwork: A Commuter's Guide to Surviving Nairobi Rush Hour",
    seoTitle: "A Commuter's Guide to Nairobi Rush Hour",
    description:
      "Using real route data, we built a time-of-day guide to the ten busiest commuter routes in Nairobi — the best departure windows, stages to avoid, and which routes have the most consistent ETAs.",
    link: "/blog/survive-nairobi-rush-hour-guide",
    date: "2024-09-03",
    category: "Guides",
    author: "Matatu Pulse Team",
  },
  {
    title: "Why We Chose SvelteKit for the Matatu Pulse Web App",
    seoTitle: "Why We Chose SvelteKit for Matatu Pulse",
    description:
      "Speed, SEO, and a lightweight bundle matter enormously when your users are on mobile data. We evaluated Next.js, Nuxt, and SvelteKit — here's why SvelteKit won, and what we'd do differently.",
    link: "/blog/why-sveltekit",
    date: "2024-07-22",
    category: "Product",
    author: "Matatu Pulse Team",
  },
  {
    title: "What Informal Transit Can Teach Smart City Planners",
    seoTitle: "What Informal Transit Teaches City Planners",
    description:
      "Nairobi's matatu network, born from necessity and shaped by market forces, has achieved frequency and coverage that planned BRT systems cost billions to replicate. A think-piece on what city planners worldwide should study.",
    link: "/blog/informal-transit-smart-city-lessons",
    date: "2024-05-09",
    category: "City",
    author: "Matatu Pulse Team",
  },
  {
    title: "Introducing the Matatu Pulse API: Build on Top of Our Transit Data",
    seoTitle: "Build on Matatu Pulse's Live Transit API",
    description:
      "Developers can now access live vehicle positions, ETA feeds, and historical route performance data via our public API. Here's the full documentation walkthrough and some early use-cases from our beta partners.",
    link: "/blog/matatu-pulse-api-launch",
    date: "2024-03-15",
    category: "Product",
    author: "Matatu Pulse Team",
  },
  {
    title:
      "Driver Experience Matters: How Operator Alerts Reduce Stress Behind the Wheel",
    seoTitle: "How Operator Alerts Reduce Driver Stress",
    description:
      "We ran a structured survey with 80 matatu drivers across five saccos. The insights about information overload, route pressure, and what alerts actually help (versus distract) shaped how we redesigned our driver-side notifications.",
    link: "/blog/driver-experience-operator-alerts",
    date: "2024-01-28",
    category: "Operations",
    author: "Matatu Pulse Team",
  },
]

// ─── Parse dates ───────────────────────────────
for (const post of blogPosts) {
  if (!post.parsedDate) {
    const [y, m, d] = post.date.split("-").map(Number)
    post.parsedDate = new Date(y, m - 1, d)
  }
}

// ─── Sorted newest-first ───────────────────────
export const sortedBlogPosts = [...blogPosts].sort(
  (a, b) => (b.parsedDate?.getTime() ?? 0) - (a.parsedDate?.getTime() ?? 0),
)

// ─── Helpers ──────────────────────────────────

/** Filter posts by category */
export function getPostsByCategory(category: string): BlogPost[] {
  return sortedBlogPosts.filter((p) => p.category === category)
}

/**
 * The string to put in the <title> tag / SERP snippet.
 * Use this in +layout.svelte's <title>{getSeoTitle(currentPost)} — {WebsiteName}</title> —
 * NOT post.title there. post.title is still correct for the on-page H1,
 * blog cards, og:title, twitter:title, and JSON-LD headline.
 */
export function getSeoTitle(post: BlogPost): string {
  return post.seoTitle ?? post.title
}

/** All unique categories in the post list */
export const allCategories: string[] = [
  ...new Set(blogPosts.map((p) => p.category).filter(Boolean) as string[]),
]
