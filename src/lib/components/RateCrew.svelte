<!-- src/lib/components/RateCrew.svelte -->
<script lang="ts">
  export let onRate: (rating: number, comment: string) => void;

  let rating = 0;
  let comment = '';
  let showModal = false;

  const stars = [1, 2, 3, 4, 5];

  function submit() {
    if (rating > 0) {
      onRate(rating, comment.trim());
      showModal = false;
      rating = 0;
      comment = '';
    }
  }
</script>

<button
  on:click={() => (showModal = true)}
  class="btn btn-success w-full rounded-2xl text-lg py-7 font-semibold shadow-md hover:shadow-lg transition-all"
>
  <span class="text-xl">Rate Crew</span>
</button>

{#if showModal}
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    on:click={() => (showModal = false)}
  >
    <div
      class="bg-base-100 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      on:click|stopPropagation
    >
      <h2 class="text-2xl font-bold mb-6 text-center">Rate Your Experience</h2>

      <div class="flex justify-center gap-3 mb-6">
        {#each stars as star}
          <button
            on:click={() => (rating = star)}
            class="text-4xl transition-transform hover:scale-110 {rating >= star ? 'text-warning' : 'text-base-content/30'}"
          >
            ★
          </button>
        {/each}
      </div>

      <textarea
        bind:value={comment}
        placeholder="How was the service? (optional)"
        class="textarea textarea-bordered w-full min-h-[100px] mb-6"
      />

      <div class="flex gap-4">
        <button class="btn btn-outline flex-1" on:click={() => (showModal = false)}>
          Cancel
        </button>
        <button
          class="btn btn-primary flex-1"
          on:click={submit}
          disabled={rating === 0}
        >
          Submit Rating
        </button>
      </div>
    </div>
  </div>
{/if}