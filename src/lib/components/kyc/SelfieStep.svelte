<script lang="ts">
  import { ScanFace, RotateCcw } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let { onNext, onPrev }: { onNext: () => void; onPrev: () => void } = $props();

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let stream: MediaStream | null = null;
  let captured = $state(false);
  let photoDataUrl = $state('');
  let cameraError = $state(false);

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoEl) videoEl.srcObject = stream;
    } catch (err) {
      cameraError = true;
    }
  }

  function captureSelfie() {
    if (!videoEl || !canvasEl) return;
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext('2d')!;
    ctx.translate(canvasEl.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0);
    photoDataUrl = canvasEl.toDataURL('image/png');
    captured = true;
    stream?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    captured = false;
    photoDataUrl = '';
    startCamera();
  }

  onMount(() => {
    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  });
</script>

<div class="space-y-8">
  <div class="text-center">
    <div class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f26522]/25 bg-[#f26522]/10">
      <ScanFace size={28} class="text-[#f26522]" strokeWidth={1.75} />
    </div>
    <h2 class="font-['Space_Grotesk',sans-serif] text-2xl font-semibold tracking-tight text-white">Take a selfie</h2>
    <p class="mt-1.5 font-['Inter',sans-serif] text-sm text-zinc-500">Center your face in good, even light</p>
  </div>

  <div class="relative mx-auto aspect-square max-w-[280px] overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]">
    {#if cameraError}
      <div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p class="font-['Inter',sans-serif] text-sm text-zinc-400">Camera access is off. Enable it in your browser settings to continue.</p>
      </div>
    {:else if !captured}
      <video bind:this={videoEl} autoplay playsinline muted class="h-full w-full scale-x-[-1] object-cover"></video>

      <div class="absolute inset-0 flex items-center justify-center">
        <div class="h-[75%] w-[75%] rounded-full border-2 border-[#f26522]/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]"></div>
      </div>

      <div class="absolute bottom-5 left-1/2 -translate-x-1/2">
        <button
          onclick={captureSelfie}
          class="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 backdrop-blur transition-transform active:scale-90"
        >
          <div class="h-12 w-12 rounded-full bg-white"></div>
        </button>
      </div>
    {:else}
      <img src={photoDataUrl} alt="Captured selfie" class="h-full w-full object-cover" />
      <div class="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/10 to-transparent pb-6">
        <div class="flex items-center gap-2 font-['Inter',sans-serif] text-sm font-medium text-cyan-300">
          <span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
          Face detected
        </div>
      </div>
    {/if}
  </div>

  <p class="text-center font-['Inter',sans-serif] text-xs text-zinc-500">
    Keep your face inside the circle. This photo is matched against your ID.
  </p>

  {#if captured}
    <div class="flex gap-3">
      <button
        onclick={retake}
        class="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 font-['Inter',sans-serif] text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
      >
        <RotateCcw size={15} /> Retake
      </button>
      <button
        onclick={onNext}
        class="flex-1 rounded-xl bg-[#f26522] py-3.5 font-['Inter',sans-serif] text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,101,34,0.5)] transition-all hover:bg-[#ff7530] active:scale-[0.99]"
      >
        Looks good, continue
      </button>
    </div>
  {/if}
</div>

<canvas bind:this={canvasEl} class="hidden"></canvas>
