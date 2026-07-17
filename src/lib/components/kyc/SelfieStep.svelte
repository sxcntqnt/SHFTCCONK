<script lang="ts">
  import { Camera, ScanFace } from '@lucide/svelte';
  import { onMount } from 'svelte';

  export let onNext: () => void;
  export let onPrev: () => void;

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let stream: MediaStream | null = null;
  let captured = $state(false);
  let photoDataUrl = $state('');

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoEl) videoEl.srcObject = stream;
    } catch (err) {
      console.error('Camera access denied', err);
    }
  }

  function captureSelfie() {
    if (!videoEl || !canvasEl) return;
    
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext('2d')!;
    ctx.drawImage(videoEl, 0, 0);
    
    photoDataUrl = canvasEl.toDataURL('image/png');
    captured = true;
    
    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  onMount(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  });
</script>

<div class="space-y-8">
  <div class="text-center">
    <div class="inline-flex w-20 h-20 bg-rose-100 dark:bg-rose-950 rounded-3xl items-center justify-center mb-6 mx-auto">
      <ScanFace size={40} class="text-rose-600" />
    </div>
    <h2 class="text-3xl font-semibold">Take a Selfie</h2>
    <p class="text-zinc-500 mt-2">Make sure your face is well lit and centered</p>
  </div>

  <div class="relative mx-auto max-w-xs aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-black">
    {#if !captured}
      <video bind:this={videoEl} autoplay playsinline class="w-full h-full object-cover"></video>
      
      <!-- Overlay guides -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-48 h-48 border-2 border-white/70 rounded-full"></div>
      </div>
      
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2">
        <button 
          on:click={captureSelfie}
          class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <div class="w-5 h-5 bg-red-500 rounded-full"></div>
        </button>
      </div>
    {:else}
      <img src={photoDataUrl} alt="Selfie" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center pb-8">
        <div class="text-white text-sm font-medium flex items-center gap-2">
          <span class="text-emerald-400">✓</span> Face detected
        </div>
      </div>
    {/if}
  </div>

  <div class="text-center text-sm text-zinc-500">
    Keep your face inside the circle. Good lighting helps verification.
  </div>

  {#if captured}
    <button on:click={onNext} class="w-full py-4 bg-emerald-600 text-white font-semibold rounded-2xl">
      Looks good, Continue
    </button>
  {/if}
</div>

<canvas bind:this={canvasEl} class="hidden"></canvas>
