<script lang="ts">
  import { createFormField, createCombobox } from '@melt-ui/svelte';
  import { UserRound, Calendar, MapPin } from '@lucide/svelte';

  export let onNext: () => void;

  let name = $state('');
  let dob = $state('');
  let country = $state('Kenya');

  // Simple form validation
  $effect(() => {
    // Could integrate with superforms or melt form
  });
</script>

<div class="space-y-8">
  <div class="text-center">
    <div class="inline-flex w-20 h-20 bg-violet-100 dark:bg-violet-950 rounded-3xl items-center justify-center mb-6">
      <UserRound size={40} class="text-violet-600" />
    </div>
    <h2 class="text-3xl font-semibold tracking-tight">Personal Details</h2>
    <p class="text-zinc-500 mt-2">Let's start with the basics</p>
  </div>

  <div class="grid grid-cols-1 gap-6">
    <div>
      <label class="block text-sm font-medium mb-2">Full Name</label>
      <input 
        bind:value={name}
        type="text" 
        placeholder="John Doe"
        class="w-full px-5 py-4 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-violet-500 transition-all text-lg"
      />
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium mb-2 flex items-center gap-2">
          <Calendar size={18} /> Date of Birth
        </label>
        <input 
          bind:value={dob}
          type="date"
          class="w-full px-5 py-4 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">Nationality</label>
        <!-- Melt Combobox would go here -->
        <select bind:value={country} class="w-full px-5 py-4 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-violet-500">
          <option value="Kenya">🇰🇪 Kenya</option>
          <option value="Uganda">🇺🇬 Uganda</option>
          <option value="Tanzania">🇹🇿 Tanzania</option>
        </select>
      </div>
    </div>
  </div>

  <button on:click={onNext} class="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl text-lg transition-all">
    Save & Continue
  </button>
</div>
