<script lang="ts">
  import KYCWizard from './KYCWizard.svelte';
</script>

<div class="min-h-screen bg-zinc-950 py-12 px-4">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-bold text-white tracking-tighter mb-4">Modern KYC Flow</h1>
      <p class="text-zinc-400 text-xl">Built with Svelte 5, Melt UI, Tailwind, Lucide & GSAP</p>
    </div>
    
    <KYCWizard />
  </div>
</div>
