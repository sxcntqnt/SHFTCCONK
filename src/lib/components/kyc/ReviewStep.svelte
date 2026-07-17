<script lang="ts">
  import { ShieldCheck, UserRound, IdCard, ScanFace, Lock } from '@lucide/svelte';

  let { onComplete, onPrev }: { onComplete: () => void; onPrev: () => void } = $props();

  const rows = [
    { icon: UserRound, label: 'Personal details', status: 'Complete' },
    { icon: IdCard, label: 'Government ID', status: 'Uploaded' },
    { icon: ScanFace, label: 'Selfie match', status: 'Verified' }
  ];

  let submitting = $state(false);

  function submit() {
    submitting = true;
    onComplete();
  }
</script>

<div class="space-y-8">
  <div class="text-center">
    <div class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f26522]/25 bg-[#f26522]/10">
      <ShieldCheck size={28} class="text-[#f26522]" strokeWidth={1.75} />
    </div>
    <h2 class="font-['Space_Grotesk',sans-serif] text-2xl font-semibold tracking-tight text-white">Review & submit</h2>
    <p class="mt-1.5 font-['Inter',sans-serif] text-sm text-zinc-500">Check everything before we run verification</p>
  </div>

  <div class="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
    {#each rows as row, i}
      <div class="flex items-center justify-between px-5 py-4 {i !== rows.length - 1 ? 'border-b border-white/[0.06]' : ''}">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400">
            <row.icon size={16} strokeWidth={1.75} />
          </div>
          <span class="font-['Inter',sans-serif] text-sm text-zinc-200">{row.label}</span>
        </div>
        <span class="flex items-center gap-1.5 font-['Inter',sans-serif] text-xs font-medium text-cyan-300">
          <span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          {row.status}
        </span>
      </div>
    {/each}
  </div>

  <button
    onclick={submit}
    disabled={submitting}
    class="w-full rounded-xl bg-[#f26522] py-3.5 font-['Inter',sans-serif] text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,101,34,0.5)] transition-all hover:bg-[#ff7530] active:scale-[0.99] disabled:opacity-70"
  >
    {submitting ? 'Submitting…' : 'Submit for verification'}
  </button>

  <p class="flex items-center justify-center gap-1.5 text-center font-['Inter',sans-serif] text-xs text-zinc-600">
    <Lock size={11} /> Your data is encrypted end to end
  </p>
</div>
