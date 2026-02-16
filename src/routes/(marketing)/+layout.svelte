<script lang="ts">
  import { WebsiteName } from "./../../config"
  import "../../app.css"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()
</script>

<!-- Sticky Navbar – sage green accents, charcoal text, no overlap -->
<nav class="navbar bg-charcoal-950/90 backdrop-blur-lg border-b border-charcoal-800 sticky top-0 z-50 shadow-sm">
  <div class="navbar-start">
    <a href="/" class="btn btn-ghost normal-case text-2xl md:text-3xl font-black tracking-tight text-sage-400">
      {WebsiteName}
    </a>
  </div>

  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1 font-semibold text-base flex-nowrap gap-8">
      <li><a href="/how-it-works" class="px-5 py-2 text-charcoal-100 hover:text-sage-300 transition-colors">How It Works</a></li>
      <li><a href="/for-commuters" class="px-5 py-2 text-charcoal-100 hover:text-sage-300 transition-colors">For Commuters</a></li>
      <li><a href="/for-operators" class="px-5 py-2 text-charcoal-100 hover:text-sage-300 transition-colors">For Operators</a></li>
      <li><a href="/updates" class="px-5 py-2 text-charcoal-100 hover:text-sage-300 transition-colors">Updates</a></li>
    </ul>
  </div>

  <div class="navbar-end flex items-center gap-5">
    <!-- Single strong CTA – sage green, prominent -->
    <a 
      href="/dashboard" 
      class="btn bg-sage-600 hover:bg-sage-700 text-white font-bold px-7 md:px-9 shadow-md hover:shadow-xl transition-all duration-300 rounded-full"
    >
      Start Tracking Now
    </a>

    <!-- Mobile menu trigger -->
    <div class="dropdown dropdown-end lg:hidden">
      <label tabindex="0" class="btn btn-ghost btn-circle text-charcoal-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </label>
      <ul tabindex="0" class="menu menu-lg dropdown-content mt-3 z-[1] p-5 shadow-2xl bg-charcoal-900 rounded-box w-64 font-semibold text-charcoal-100">
        <li><a href="/how-it-works" class="py-3 hover:bg-sage-800/30">How It Works</a></li>
        <li><a href="/for-commuters" class="py-3 hover:bg-sage-800/30">For Commuters</a></li>
        <li><a href="/for-operators" class="py-3 hover:bg-sage-800/30">For Operators</a></li>
        <li><a href="/updates" class="py-3 hover:bg-sage-800/30">Updates</a></li>
        <li class="mt-5 border-t border-charcoal-700 pt-5">
          <a href="/dashboard" class="btn bg-sage-600 hover:bg-sage-700 text-white w-full rounded-full">Start Tracking Now</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- Main content with padding to avoid navbar overlap on scroll -->
<main class="flex flex-col min-h-screen bg-charcoal-50 pt-4 md:pt-0">
  {@render children?.()}
</main>

<!-- Footer – charcoal + sage accents, more socials -->
<footer class="bg-charcoal-900 text-charcoal-100 border-t border-charcoal-800 mt-auto">
  <div class="max-w-7xl mx-auto px-6 py-14 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-14">
    <!-- Brand & tagline -->
    <aside class="col-span-2 md:col-span-1">
      <h3 class="font-black text-3xl mb-5 text-sage-400">{WebsiteName}</h3>
      <p class="text-base opacity-80 mb-8 leading-relaxed">
        Real-time matatu tracking in Nairobi – predictable arrivals, smarter commutes, better operations.
      </p>
      <div class="flex gap-6 text-3xl">
        <a href="#" aria-label="Facebook" class="opacity-70 hover:opacity-100 hover:text-sage-300 transition">📘</a>
        <a href="#" aria-label="WhatsApp" class="opacity-70 hover:opacity-100 hover:text-sage-300 transition">💬</a>
        <a href="#" aria-label="TikTok" class="opacity-70 hover:opacity-100 hover:text-sage-300 transition">🎵</a>
        <a href="#" aria-label="Instagram" class="opacity-70 hover:opacity-100 hover:text-sage-300 transition">📸</a>
        <a href="#" aria-label="X/Twitter" class="opacity-70 hover:opacity-100 hover:text-sage-300 transition">𝕏</a>
      </div>
    </aside>

    <!-- Product -->
    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-sage-300 font-bold mb-4 uppercase tracking-wider text-sm">Product</h6>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Overview</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Features</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Pricing</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Track Now</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Games</a>
    </nav>

    <!-- Company -->
    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-sage-300 font-bold mb-4 uppercase tracking-wider text-sm">Company</h6>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">About</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Updates</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Contact</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Blog</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">FAQ</a>
    </nav>

    <!-- Legal -->
    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-sage-300 font-bold mb-4 uppercase tracking-wider text-sm">Legal</h6>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Privacy Policy</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Terms of Service</a>
      <a class="link link-hover opacity-90 hover:text-sage-300 transition">Security</a>
    </nav>
  </div>

  <!-- Bottom section with CTA nudge -->
  <div class="bg-charcoal-950 py-8 text-center text-sm opacity-80 border-t border-charcoal-800">
    <p class="mb-4 font-medium text-base">
      Stop waiting in uncertainty – see your matatu coming in real time.
      <a href="/dashboard" class="text-sage-400 font-bold hover:underline ml-2">Start free today</a>
    </p>
    <p>© {new Date().getFullYear()} {WebsiteName}. Designed for ethical, smarter urban mobility.</p>
  </div>
</footer>