<script lang="ts">
  import { Upload, FileText, CheckCircle2, IdCard } from '@lucide/svelte';

  let { onNext, onPrev }: { onNext: () => void; onPrev: () => void } = $props();

  let frontUploaded = $state(false);
  let backUploaded = $state(false);
  let dragSide = $state<'front' | 'back' | null>(null);

  function handleDrop(e: DragEvent, side: 'front' | 'back') {
    e.preventDefault();
    dragSide = null;
    if (side === 'front') frontUploaded = true;
    else backUploaded = true;
  }

  function handleSelect(side: 'front' | 'back') {
    if (side === 'front') frontUploaded = true;
    else backUploaded = true;
  }
</script>

{#snippet dropzone(side: 'front' | 'back', label: string, sublabel: string, uploaded: boolean)}
  <div
    class="group relative rounded-2xl border p-6 text-center transition-all duration-300
    {uploaded ? 'border-cyan-400/30 bg-cyan-400/[0.06]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}
    {dragSide === side ? 'border-[#f26522]/60 bg-[#f26522]/[0.06]' : ''}"
    ondragover={(e) => { e.preventDefault(); dragSide = side; }}
    ondragleave={() => (dragSide = null)}
    ondrop={(e) => handleDrop(e, side)}
  >
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105
      {uploaded ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/10 bg-white/[0.04]'}">
      {#if uploaded}
        <CheckCircle2 size={22} class="text-cyan-300" />
      {:else}
        <FileText size={22} class="text-zinc-500" />
      {/if}
    </div>

    <p class="font-['Inter',sans-serif] text-sm font-medium text-zinc-200">{label}</p>
    <p class="mt-0.5 font-['Inter',sans-serif] text-xs text-zinc-500">{sublabel}</p>

    {#if !uploaded}
      <button
        onclick={() => handleSelect(side)}
        class="mt-5 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 py-5 transition-colors hover:border-[#f26522]/50 hover:bg-[#f26522]/[0.04]"
      >
        <Upload size={20} class="text-[#f26522]" strokeWidth={1.75} />
        <span class="font-['Inter',sans-serif] text-xs text-zinc-400">
          Drop file or <span class="font-medium text-[#f26522]">browse</span>
        </span>
      </button>
    {:else}
      <div class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-black/20 py-2.5 font-['Inter',sans-serif] text-xs text-cyan-300">
        <span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
        Uploaded
      </div>
    {/if}
  </div>
{/snippet}

<div class="space-y-8">
  <div class="text-center">
    <div class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f26522]/25 bg-[#f26522]/10">
      <IdCard size={28} class="text-[#f26522]" strokeWidth={1.75} />
    </div>
    <h2 class="font-['Space_Grotesk',sans-serif] text-2xl font-semibold tracking-tight text-white">Government ID</h2>
    <p class="mt-1.5 font-['Inter',sans-serif] text-sm text-zinc-500">Clear, uncropped photos of a passport or national ID</p>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {@render dropzone('front', 'Front side', 'Photo page', frontUploaded)}
    {@render dropzone('back', 'Back side', 'Signature page', backUploaded)}
  </div>

  <button
    onclick={onNext}
    disabled={!frontUploaded}
    class="w-full rounded-xl bg-[#f26522] py-3.5 font-['Inter',sans-serif] text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,101,34,0.5)] transition-all hover:bg-[#ff7530] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-zinc-600 disabled:shadow-none"
  >
    Continue to selfie
  </button>
</div>
