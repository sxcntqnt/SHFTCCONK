<script lang="ts">
  import { CheckCircle2, ShieldCheck } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let confettiContainer: HTMLElement;

  onMount(() => {
    // Simple celebration animation
    if (confettiContainer) {
      gsap.from(confettiContainer, { scale: 0.6, rotation: -15, duration: 0.8, ease: "back.out(1.4)" });
    }
  });
</script>

<div class="flex flex-col items-center justify-center min-h-[420px] text-center py-12">
  <div bind:this={confettiContainer} class="mb-8">
    <div class="inline-flex w-28 h-28 bg-emerald-100 dark:bg-emerald-900 rounded-full items-center justify-center">
      <CheckCircle2 size={80} class="text-emerald-600" />
    </div>
  </div>
  
  <h1 class="text-4xl font-bold tracking-tighter mb-3">Verification Complete!</h1>
  <p class="text-xl text-emerald-600 font-medium">You're all set</p>
  
  <div class="mt-12 w-full max-w-xs bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6">
    <div class="flex items-center gap-4 text-left">
      <ShieldCheck class="text-emerald-500" size={28} />
      <div>
        <div class="font-semibold">Identity Verified</div>
        <div class="text-sm text-zinc-500">KYC Level 2 Approved</div>
      </div>
    </div>
  </div>

  <button class="mt-12 px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold">
    Go to Dashboard
  </button>
</div>
