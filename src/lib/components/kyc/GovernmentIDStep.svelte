<script lang="ts">
  import { Upload, FileText, Camera, CheckCircle2 } from '@lucide/svelte';
  import { onMount } from 'svelte';

  export let onNext: () => void;
  export let onPrev: () => void;

  let frontUploaded = $state(false);
  let backUploaded = $state(false);
  let documentType = $state('passport');

  let dragOver = $state(false);

  function handleDrop(e: DragEvent, side: 'front' | 'back') {
    e.preventDefault();
    dragOver = false;
    // Simulate upload
    if (side === 'front') frontUploaded = true;
    else backUploaded = true;
  }

  function handleFileSelect(side: 'front' | 'back') {
    // Simulate
    if (side === 'front') frontUploaded = true;
    else backUploaded = true;
  }
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-3xl font-semibold mb-2">Government ID</h2>
    <p class="text-zinc-500">Upload clear photos of your ID document</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Front -->
    <div class="border-2 border-dashed {frontUploaded ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-zinc-300 dark:border-zinc-700'} rounded-3xl p-8 text-center transition-all group">
      <div class="mx-auto w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {#if frontUploaded}
          <CheckCircle2 class="text-emerald-500" size={32} />
        {:else}
          <FileText size={32} class="text-zinc-400" />
        {/if}
      </div>
      <p class="font-medium">Front Side</p>
      <p class="text-sm text-zinc-500 mt-1">Passport or National ID</p>
      
      {#if !frontUploaded}
        <div 
          class="mt-6 p-6 border border-dashed rounded-2xl cursor-pointer {dragOver ? 'border-violet-500 bg-violet-50' : ''}"
          on:dragover={(e) => {e.preventDefault(); dragOver = true;}}
          on:dragleave={() => dragOver = false}
          on:drop={(e) => handleDrop(e, 'front')}
          on:click={() => handleFileSelect('front')}
        >
          <Upload class="mx-auto mb-3 text-violet-500" size={28} />
          <p class="text-sm font-medium">Drag & drop or <span class="text-violet-600 underline">browse files</span></p>
        </div>
      {:else}
        <div class="mt-4 p-3 bg-white dark:bg-zinc-900 rounded-2xl text-left text-sm">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Front uploaded successfully</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Back -->
    <div class="border-2 border-dashed {backUploaded ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-zinc-300 dark:border-zinc-700'} rounded-3xl p-8 text-center transition-all group">
      <div class="mx-auto w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {#if backUploaded}
          <CheckCircle2 class="text-emerald-500" size={32} />
        {:else}
          <FileText size={32} class="text-zinc-400" />
        {/if}
      </div>
      <p class="font-medium">Back Side</p>
      
      {#if !backUploaded}
        <div 
          class="mt-6 p-6 border border-dashed rounded-2xl cursor-pointer"
          on:click={() => handleFileSelect('back')}
        >
          <Upload class="mx-auto mb-3 text-violet-500" size={28} />
          <p class="text-sm font-medium">Upload Back Side</p>
        </div>
      {:else}
        <div class="mt-4 p-3 bg-white dark:bg-zinc-900 rounded-2xl text-left text-sm">
          Back uploaded
        </div>
      {/if}
    </div>
  </div>

  <button 
    on:click={onNext}
    disabled={!frontUploaded}
    class="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 text-white font-semibold rounded-2xl text-lg transition-all flex items-center justify-center gap-3"
  >
    Continue to Selfie
    <span class="text-xl">→</span>
  </button>
</div>
