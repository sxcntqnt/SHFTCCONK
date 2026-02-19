<script lang="ts">
  import { WebsiteName } from "./../../config";
  import "../../app.css";

  interface Props {
    children?: import("svelte").Snippet;
  }
  let { children }: Props = $props();
</script>

<!-- Navbar – stronger glass + subtle gradient border -->
<nav class="navbar bg-charcoal-950/85 backdrop-blur-xl border-b border-sage-700/30 sticky top-0 z-50 shadow-lg">
  <div class="navbar-start">
    <a href="/" class="btn btn-ghost normal-case text-2xl md:text-3xl font-black tracking-tight text-sage-400 hover:text-sage-300 transition-colors">
      {WebsiteName}
    </a>
  </div>

  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1 font-semibold text-base flex-nowrap gap-8">
      <li><a href="/blog" class="px-5 py-2 text-charcoal-100 hover:text-matatu-orange hover:bg-charcoal-800/50 rounded-full transition-all">How It Works</a></li>
      <li><a href="/blog" class="px-5 py-2 text-charcoal-100 hover:text-matatu-orange hover:bg-charcoal-800/50 rounded-full transition-all">Commuters</a></li>
      <li><a href="/blog" class="px-5 py-2 text-charcoal-100 hover:text-matatu-orange hover:bg-charcoal-800/50 rounded-full transition-all">Operators</a></li>
      <li><a href="/blog" class="px-5 py-2 text-charcoal-100 hover:text-matatu-orange hover:bg-charcoal-800/50 rounded-full transition-all">Enterprise</a></li>
    </ul>
  </div>

  <div class="navbar-end flex items-center gap-5">
    <!-- Prominent CTA – vibrant orange energy -->
    <a
      href="/dashboard"
      class="btn bg-matatu-orange hover:bg-matatu-orange/90 text-white font-bold px-7 md:px-9 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-full border border-matatu-orange/40"
    >
      Start Tracking Now
    </a>

    <!-- Mobile menu – more colorful -->
    <div class="dropdown dropdown-end lg:hidden">
      <label tabindex="0" class="btn btn-ghost btn-circle text-charcoal-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </label>
      <ul tabindex="0" class="menu menu-lg dropdown-content mt-3 z-[1] p-6 shadow-2xl bg-charcoal-900/95 backdrop-blur-lg rounded-2xl w-72 font-semibold text-charcoal-100 border border-sage-700/30">
        <li><a href="/how-it-works" class="py-3.5 hover:bg-matatu-orange/20 hover:text-matatu-orange rounded-xl transition">How It Works</a></li>
        <li><a href="/for-commuters" class="py-3.5 hover:bg-matatu-orange/20 hover:text-matatu-orange rounded-xl transition">Commuters</a></li>
        <li><a href="/for-operators" class="py-3.5 hover:bg-matatu-orange/20 hover:text-matatu-orange rounded-xl transition">Operators</a></li>
        <li><a href="/updates" class="py-3.5 hover:bg-matatu-orange/20 hover:text-matatu-orange rounded-xl transition">Updates</a></li>
        <li class="mt-6 border-t border-charcoal-700 pt-6">
          <a href="/dashboard" class="btn bg-matatu-orange hover:bg-matatu-orange/90 text-white w-full rounded-full shadow-md">Start Tracking Now</a>
        </li>
      </ul>
    </div>
  </div>
</nav>

<!-- Main content – vibrant gradient background + subtle texture -->
<main class="flex flex-col min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-sage-800/40 pt-4 md:pt-0 relative overflow-hidden">
  <!-- Optional subtle overlay pattern urban feel (dots/grid) -->
  <div class="absolute inset-0 opacity-5 pointer-events-none"
       style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;">
  </div>

  <div class="relative z-10">
    {@render children?.()}
  </div>
</main>

<!-- Footer – gradient accents + more life -->
<footer class="bg-gradient-to-t from-charcoal-950 to-charcoal-900 text-charcoal-100 border-t border-sage-700/30 mt-auto">
  <div class="max-w-7xl mx-auto px-6 py-14 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-14">
    <!-- Brand & tagline -->
    <aside class="col-span-2 md:col-span-1">
      <h3 class="font-black text-3xl mb-5 text-sage-400 drop-shadow-md">{WebsiteName}</h3>
      <p class="text-base opacity-85 mb-8 leading-relaxed">
        Real-time matatu tracking in Nairobi – predictable arrivals, smarter commutes, better operations.
      </p>
      <div class="flex flex-col gap-3 text-3xl">
  <!-- Top row: 3 icons -->
  <div class="flex gap-7 justify-start">
    <a href="#" aria-label="Facebook" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">📘</a>
    <a href="#" aria-label="WhatsApp" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">💬</a>
    <a href="#" aria-label="TikTok" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">🎵</a>
  </div>

  <!-- Bottom row: remaining 2 icons -->
  <div class="flex gap-7 justify-start">
    <a href="#" aria-label="Instagram" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">📸</a>
    <a href="#" aria-label="X/Twitter" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">𝕏</a>
    <a href="#" aria-label="Youtube" class="opacity-75 hover:opacity-100 hover:text-matatu-orange transition transform hover:scale-110">📸</a>

  </div>
</div>

    </aside>

    <!-- Product / Company / Legal – with teal accent option -->
    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-matatu-teal font-bold mb-4 uppercase tracking-wider text-sm">Product</h6>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Overview</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Features</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Pricing</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Track Now</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Games</a>
    </nav>

    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-matatu-teal font-bold mb-4 uppercase tracking-wider text-sm">Company</h6>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">About</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Updates</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Contact</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Blog</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">FAQ</a>
    </nav>

    <nav class="flex flex-col gap-3">
      <h6 class="footer-title text-matatu-teal font-bold mb-4 uppercase tracking-wider text-sm">Legal</h6>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Privacy Policy</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Terms of Service</a>
      <a class="link link-hover opacity-90 hover:text-matatu-teal transition">Security</a>
    </nav>
  </div>

  <!-- Bottom CTA nudge – energetic -->
<!-- Bottom CTA nudge – energetic & clearly separated -->
<div class="bg-charcoal-900 py-8 text-center text-sm border-t-2 border-matatu-orange shadow-md">
  <p class="mb-4 font-medium text-base text-sage-200">
    Stop waiting in uncertainty – see your matatu coming in real time.
    <a href="/dashboard" class="text-matatu-orange font-bold hover:underline ml-2 transition">Start free today →</a>
  </p>
  <p class="text-charcoal-400">© {new Date().getFullYear()} {WebsiteName}. Designed ethical, smarter urban mobility.</p>
</div>

</footer>