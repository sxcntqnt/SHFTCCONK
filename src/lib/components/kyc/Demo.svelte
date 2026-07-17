<script lang="ts">
  import KYCWizard from './KYCWizard.svelte';
</script>

<div class="relative min-h-screen overflow-hidden bg-[#0a0d13] px-4 py-16">
  <!-- ambient glows -->
  <div class="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#f26522]/[0.08] blur-[120px]"></div>
  <div class="pointer-events-none absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-cyan-400/[0.06] blur-[120px]"></div>

  <!-- faint route-grid texture -->
  <div
    class="pointer-events-none absolute inset-0 opacity-[0.035]"
    style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 48px 48px;"
  ></div>

  <div class="relative mx-auto max-w-4xl">
    <div class="mb-12 text-center">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-['Inter',sans-serif] text-xs font-medium text-zinc-400">
        <span class="h-1.5 w-1.5 rounded-full bg-[#f26522]"></span>
        Identity verification
      </div>
      <h1 class="font-['Space_Grotesk',sans-serif] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Verify your identity
      </h1>
      <p class="mx-auto mt-4 max-w-md font-['Inter',sans-serif] text-zinc-500">
        Five quick steps to unlock your operator account
      </p>
    </div>

    <KYCWizard />
  </div>
</div>
