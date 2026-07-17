<script lang="ts">
  import { ShieldCheck, UserRound, CreditCard, ScanFace, CheckCircle2, Check } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import PersonalDetailsStep from './PersonalDetailsStep.svelte';
  import GovernmentIDStep from './GovernmentIDStep.svelte';
  import SelfieStep from './SelfieStep.svelte';
  import ReviewStep from './ReviewStep.svelte';
  import CompletionStep from './CompletionStep.svelte';

  const steps = [
    { id: 0, title: 'Personal', icon: UserRound },
    { id: 1, title: 'ID Document', icon: CreditCard },
    { id: 2, title: 'Selfie', icon: ScanFace },
    { id: 3, title: 'Review', icon: ShieldCheck },
    { id: 4, title: 'Done', icon: CheckCircle2 }
  ];

  let currentStep = $state(0);
  let completedSteps = $state(new Set<number>());
  let contentEl: HTMLElement;

  function goToStep(step: number) {
    if (step < 0 || step >= steps.length) return;
    if (step > currentStep) completedSteps.add(currentStep);

    if (contentEl) {
      const dir = step > currentStep ? 14 : -14;
      gsap.to(contentEl, {
        opacity: 0,
        y: dir,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          currentStep = step;
          gsap.fromTo(
            contentEl,
            { opacity: 0, y: -dir },
            { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }
          );
        }
      });
    } else {
      currentStep = step;
    }
  }

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  onMount(() => {
    if (contentEl) gsap.from(contentEl, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out' });
  });
</script>

<div class="relative max-w-2xl mx-auto">
  <!-- ambient route-grid backdrop -->
  <div class="pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-br from-[#f26522]/[0.08] via-transparent to-cyan-400/[0.06]"></div>

  <div class="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#12161f]/90 backdrop-blur-xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]">
    <!-- faint dot-grid texture -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.05]"
      style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1px); background-size: 22px 22px;"
    ></div>

    <div class="relative p-6 sm:p-8">
      <!-- Route-line stepper -->
      <div class="mb-10">
        <div class="relative flex justify-between">
          <div class="absolute left-6 right-6 top-6 h-px bg-white/10">
            <div
              class="h-full bg-gradient-to-r from-[#f26522] to-[#ff8a4c] transition-[width] duration-500 ease-out"
              style="width: {(currentStep / (steps.length - 1)) * 100}%"
            ></div>
          </div>

          {#each steps as step, index}
            {@const isDone = index < currentStep}
            {@const isCurrent = index === currentStep}
            <button
              onclick={() => goToStep(index)}
              disabled={index > currentStep}
              class="group relative z-10 flex flex-col items-center gap-3 {index > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'}"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300
                {isCurrent
                  ? 'border-[#f26522] bg-[#f26522] text-white shadow-[0_0_0_4px_rgba(242,101,34,0.18)] scale-105'
                  : isDone
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                    : 'border-white/10 bg-white/[0.03] text-zinc-500 group-hover:border-white/20'}"
              >
                {#if isDone}
                  <Check size={18} strokeWidth={2.5} />
                {:else}
                  <step.icon size={18} strokeWidth={2} />
                {/if}
              </div>
              <span
                class="text-[11px] font-medium tracking-wide font-['Inter',sans-serif] {isCurrent
                  ? 'text-[#f26522]'
                  : isDone
                    ? 'text-cyan-300/80'
                    : 'text-zinc-600'}"
              >
                {step.title}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Step content -->
      <div bind:this={contentEl} class="min-h-[400px]">
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
        <div class="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <button
            onclick={prevStep}
            disabled={currentStep === 0}
            class="rounded-xl px-5 py-2.5 font-['Inter',sans-serif] text-sm font-medium text-zinc-400 transition-all hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ← Back
          </button>

          <button
            onclick={nextStep}
            class="group flex items-center gap-2 rounded-xl bg-[#f26522] px-6 py-2.5 font-['Inter',sans-serif] text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,101,34,0.5)] transition-all hover:bg-[#ff7530] hover:shadow-[0_6px_20px_-4px_rgba(242,101,34,0.6)] active:scale-[0.98]"
          >
            Continue
            <span class="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
