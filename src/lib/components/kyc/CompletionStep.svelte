<script lang="ts">
  import { Check, ShieldCheck } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let badgeEl: HTMLElement;
  let ringEl: SVGCircleElement;

  onMount(() => {
    if (badgeEl) {
      gsap.from(badgeEl, { scale: 0.5, opacity: 0, duration: 0.6, ease: 'back.out(1.6)' });
    }
    if (ringEl) {
      const len = ringEl.getTotalLength();
      gsap.set(ringEl, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(ringEl, { strokeDashoffset: 0, duration: 0.9, delay: 0.15, ease: 'power2.out' });
    }
  });
</script>

<div class="flex min-h-[400px] flex-col items-center justify-center py-8 text-center">
  <div bind:this={badgeEl} class="relative mb-8">
    <svg width="112" height="112" viewBox="0 0 112 112" class="-rotate-90">
      <circle cx="56" cy="56" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4" />
      <circle
        bind:this={ringEl}
        cx="56"
        cy="56"
        r="50"
        fill="none"
        stroke="#2dd4bf"
        stroke-width="4"
        stroke-linecap="round"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10">
        <Check size={32} class="text-cyan-300" strokeWidth={2.5} />
      </div>
    </div>
  </div>

  <h1 class="font-['Space_Grotesk',sans-serif] text-3xl font-semibold tracking-tight text-white">Verification complete</h1>
  <p class="mt-2 font-['Inter',sans-serif] text-sm text-cyan-300">You're all set to ride</p>

  <div class="mt-10 w-full max-w-xs rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
    <div class="flex items-center gap-3.5">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f26522]/10">
        <ShieldCheck size={18} class="text-[#f26522]" strokeWidth={1.75} />
      </div>
      <div>
        <div class="font-['Inter',sans-serif] text-sm font-medium text-white">Identity verified</div>
        <div class="font-['JetBrains_Mono',monospace] text-[11px] text-zinc-500">KYC Level 2 · Approved</div>
      </div>
    </div>
  </div>

  <button
    class="mt-10 rounded-xl bg-white px-8 py-3.5 font-['Inter',sans-serif] text-sm font-semibold text-[#0b0e14] transition-all hover:bg-zinc-200 active:scale-[0.98]"
  >
    Go to dashboard
  </button>
</div>
