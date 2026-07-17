<script lang="ts">
  import { createStepper } from '@melt-ui/svelte';
  import { ShieldCheck, UserRound, CreditCard, ScanFace, CheckCircle2 } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  // Steps
  const steps = [
    { id: 0, title: 'Personal Details', icon: UserRound },
    { id: 1, title: 'Government ID', icon: CreditCard },
    { id: 2, title: 'Selfie', icon: ScanFace },
    { id: 3, title: 'Review', icon: ShieldCheck },
    { id: 4, title: 'Complete', icon: CheckCircle2 }
  ];

  let currentStep = $state(0);
  let completedSteps = $state(new Set());

  const stepper = createStepper({
    count: steps.length,
    orientation: 'horizontal'
  });

  // GSAP animations for step transitions
  let contentEl: HTMLElement;

  function goToStep(step: number) {
    if (step < 0 || step >= steps.length) return;
    
    // Animate out
    if (contentEl) {
      gsap.to(contentEl, {
        opacity: 0,
        x: step > currentStep ? 50 : -50,
        duration: 0.3,
        onComplete: () => {
          currentStep = step;
          // Animate in
          gsap.fromTo(contentEl, 
            { opacity: 0, x: step > currentStep ? -50 : 50 },
            { opacity: 1, x: 0, duration: 0.4 }
          );
        }
      });
    } else {
      currentStep = step;
    }
    
    if (step > currentStep) {
      completedSteps.add(currentStep);
    }
  }

  function nextStep() {
    goToStep(currentStep + 1);
  }

  function prevStep() {
    goToStep(currentStep - 1);
  }

  onMount(() => {
    // Initial animation
    if (contentEl) {
      gsap.from(contentEl, { opacity: 0, y: 20, duration: 0.6 });
    }
  });
</script>

<div class="max-w-2xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
  <!-- Progress / Stepper -->
  <div class="mb-10">
    <div class="flex justify-between mb-4">
      {#each steps as step, index}
        <button 
          on:click={() => goToStep(index)}
          class="flex flex-col items-center group {index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}"
        >
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
            {index === currentStep 
              ? 'bg-violet-600 text-white scale-110 shadow-lg' 
              : index < currentStep 
                ? 'bg-emerald-500 text-white' 
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}">
            <svelte:component this={step.icon} size={24} />
          </div>
          <span class="mt-3 text-sm font-medium {index === currentStep ? 'text-violet-600' : 'text-zinc-500'}">
            {step.title}
          </span>
        </button>
      {/each}
    </div>

    <!-- Progress Bar -->
    <div class="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div 
        class="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500 rounded-full"
        style="width: {(currentStep / (steps.length - 1)) * 100}%"
      ></div>
    </div>
  </div>

  <!-- Step Content -->
  <div bind:this={contentEl} class="min-h-[400px] transition-all">
    {#if currentStep === 0}
      <PersonalDetailsStep onNext={nextStep} />
    {:else if currentStep === 1}
      <GovernmentIDStep onNext={nextStep} onPrev={prevStep} />
    {:else if currentStep === 2}
      <SelfieStep onNext={nextStep} onPrev={prevStep} />
    {:else if currentStep === 3}
      <ReviewStep onComplete={nextStep} onPrev={prevStep} />
    {:else if currentStep === 4}
      <CompletionStep />
    {/if}
  </div>

  <!-- Navigation -->
  {#if currentStep < 4}
    <div class="flex justify-between mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
      <button 
        on:click={prevStep}
        disabled={currentStep === 0}
        class="px-6 py-3 text-sm font-semibold flex items-center gap-2 disabled:opacity-40 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl"
      >
        ← Previous
      </button>
      
      <button 
        on:click={nextStep}
        class="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold flex items-center gap-2 rounded-2xl transition-all shadow-lg shadow-violet-500/30"
      >
        Continue → 
      </button>
    </div>
  {/if}
</div>

<style>
  /* Additional modern styles */
</style>
