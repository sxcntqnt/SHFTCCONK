<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    onRate: (rating: number, comment: string) => void;
  }

  // Correct Svelte 5 syntax — type on left, no <Props> on $props()
  let { onRate }: Props = $props();

  let rating = $state(0);
  let comment = $state('');
  let showModal = $state(false);

  let starRefs: (HTMLElement | null)[] = $state([]);

  const stars = [1, 2, 3, 4, 5];

  let canSubmit = $derived(rating > 0);

  function submit() {
    if (!canSubmit) return;
    onRate(rating, comment.trim());
    closeModal();
  }

  function openModal() {
    showModal = true;
    tick().then(() => {
      starRefs[0]?.focus();
    });
  }

  function closeModal() {
    showModal = false;
    rating = 0;
    comment = '';
    starRefs = [];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!showModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key !== 'Tab') return;

    const active = document.activeElement as HTMLElement | null;
    const first = starRefs[0];
    const last = starRefs.at(-1);

    if (!first || !last) return;

    if (active === last && !e.shiftKey) {
      e.preventDefault();
      first.focus();
    } else if (active === first && e.shiftKey) {
      e.preventDefault();
      last.focus();
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    // Close only on direct backdrop click (not bubbled from inner content)
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeModal();
    }
  }

  $effect(() => {
    if (showModal) {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

<button
  onclick={openModal}
  class="btn btn-success w-full rounded-2xl text-lg py-7 font-semibold shadow-md hover:shadow-lg transition-all"
>
  <span class="text-xl">Rate Crew</span>
</button>

{#if showModal}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="rate-modal-title"
    tabindex="-1"
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onclick={handleOverlayClick}
    onkeydown={handleOverlayKeydown}
  >
    <div class="bg-base-100 rounded-3xl p-8 max-w-md w-full shadow-2xl">
      <h2 id="rate-modal-title" class="text-2xl font-bold mb-6 text-center">Rate Your Experience</h2>

      <div class="flex justify-center gap-3 mb-6">
        {#each stars as star, i}
          <button
            type="button"
            onclick={() => rating = star}
            class="text-4xl transition-transform hover:scale-110 {rating >= star ? 'text-warning' : 'text-base-content/30'}"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            bind:this={starRefs[i]}
          >
            ★
          </button>
        {/each}
      </div>

      <textarea
        bind:value={comment}
        placeholder="How was the service? (optional)"
        class="textarea textarea-bordered w-full min-h-[100px] mb-6"
      ></textarea>

      <div class="flex gap-4">
        <button
          type="button"
          class="btn btn-outline flex-1"
          onclick={closeModal}
        >
          Cancel
        </button>

        <button
          type="button"
          class="btn btn-primary flex-1"
          onclick={submit}
          disabled={!canSubmit}
        >
          Submit Rating
        </button>
      </div>
    </div>
  </div>
{/if}