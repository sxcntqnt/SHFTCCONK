<script lang="ts">
  export let onComplete: () => void;
  export let onPrev: () => void;
</script>

<div class="space-y-8">
  <h2 class="text-3xl font-semibold text-center">Review Your Information</h2>
  
  <div class="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-8 space-y-6">
    <div class="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800">
      <div>Personal Details</div>
      <div class="text-emerald-600 font-medium">Complete ✓</div>
    </div>
    <div class="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800">
      <div>Government ID</div>
      <div class="text-emerald-600 font-medium">Uploaded ✓</div>
    </div>
    <div class="flex justify-between items-center py-3">
      <div>Selfie</div>
      <div class="text-emerald-600 font-medium">Verified ✓</div>
    </div>
  </div>

  <button 
    on:click={onComplete}
    class="w-full py-4 bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-semibold rounded-2xl text-lg"
  >
    Submit for Verification
  </button>
  
  <p class="text-center text-xs text-zinc-500">Your data is encrypted and secure</p>
</div>
