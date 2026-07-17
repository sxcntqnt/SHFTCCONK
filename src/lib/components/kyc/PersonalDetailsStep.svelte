<script lang="ts">
  import { UserRound, Calendar, Globe2 } from '@lucide/svelte';

  let { onNext }: { onNext: () => void } = $props();

  let name = $state('');
  let dob = $state('');
  let country = $state('Kenya');

  const countries = [
    { value: 'Kenya', flag: '🇰🇪' },
    { value: 'Uganda', flag: '🇺🇬' },
    { value: 'Tanzania', flag: '🇹🇿' },
    { value: 'Rwanda', flag: '🇷🇼' }
  ];

  let isValid = $derived(name.trim().length > 1 && dob.length > 0);
</script>

<div class="space-y-8">
  <div class="text-center">
    <div class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f26522]/25 bg-[#f26522]/10">
      <UserRound size={28} class="text-[#f26522]" strokeWidth={1.75} />
    </div>
    <h2 class="font-['Space_Grotesk',sans-serif] text-2xl font-semibold tracking-tight text-white">Personal details</h2>
    <p class="mt-1.5 font-['Inter',sans-serif] text-sm text-zinc-500">Tell us who's registering for verification</p>
  </div>

  <div class="space-y-5">
    <div>
      <label for="fullname" class="mb-2 block font-['Inter',sans-serif] text-xs font-medium uppercase tracking-wide text-zinc-500">
        Full legal name
      </label>
      <input
        id="fullname"
        bind:value={name}
        type="text"
        placeholder="As it appears on your ID"
        class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 font-['Inter',sans-serif] text-white placeholder:text-zinc-600 outline-none transition-all focus:border-[#f26522]/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-[#f26522]/[0.08]"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="dob" class="mb-2 flex items-center gap-1.5 font-['Inter',sans-serif] text-xs font-medium uppercase tracking-wide text-zinc-500">
          <Calendar size={13} /> Date of birth
        </label>
        <input
          id="dob"
          bind:value={dob}
          type="date"
          class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 font-['Inter',sans-serif] text-sm text-white outline-none transition-all focus:border-[#f26522]/60 focus:ring-4 focus:ring-[#f26522]/[0.08] [color-scheme:dark]"
        />
      </div>
      <div>
        <label for="country" class="mb-2 flex items-center gap-1.5 font-['Inter',sans-serif] text-xs font-medium uppercase tracking-wide text-zinc-500">
          <Globe2 size={13} /> Nationality
        </label>
        <select
          id="country"
          bind:value={country}
          class="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 font-['Inter',sans-serif] text-sm text-white outline-none transition-all focus:border-[#f26522]/60 focus:ring-4 focus:ring-[#f26522]/[0.08]"
        >
          {#each countries as c}
            <option value={c.value} class="bg-[#171c26]">{c.flag} {c.value}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <button
    onclick={onNext}
    disabled={!isValid}
    class="w-full rounded-xl bg-[#f26522] py-3.5 font-['Inter',sans-serif] text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,101,34,0.5)] transition-all hover:bg-[#ff7530] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-zinc-600 disabled:shadow-none"
  >
    Save & continue
  </button>
</div>
