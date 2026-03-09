<!-- src/lib/components/RateCrew.svelte -->
<script lang="ts">
  import { tick } from "svelte"

  interface Props {
    onRate: (rating: number, comment: string) => void
  }
  let { onRate }: Props = $props()

  let rating = $state(0)
  let hoverRating = $state(0)
  let comment = $state("")
  let showModal = $state(false)
  let submitting = $state(false)
  let starRefs: (HTMLElement | null)[] = $state([])

  const stars = [1, 2, 3, 4, 5]
  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"]
  let canSubmit = $derived(rating > 0 && !submitting)
  let activeRating = $derived(hoverRating || rating)

  async function submit() {
    if (!canSubmit) return
    submitting = true
    await new Promise((r) => setTimeout(r, 500))
    onRate(rating, comment.trim())
    closeModal()
  }

  function openModal() {
    showModal = true
    tick().then(() => starRefs[0]?.focus())
  }

  function closeModal() {
    showModal = false
    rating = 0
    hoverRating = 0
    comment = ""
    submitting = false
    starRefs = []
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!showModal) return
    if (e.key === "Escape") {
      e.preventDefault()
      closeModal()
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal()
  }

  $effect(() => {
    if (showModal) {
      window.addEventListener("keydown", handleKeydown)
      document.body.style.overflow = "hidden"
      return () => {
        window.removeEventListener("keydown", handleKeydown)
        document.body.style.overflow = ""
      }
    }
  })
</script>

<button onclick={openModal} class="rate-trigger">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
    />
  </svg>
  <span>Rate Crew</span>
</button>

{#if showModal}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="rate-modal-title"
    class="rate-overlay"
    onclick={handleOverlayClick}
  >
    <div class="rate-modal" class:rate-submitting={submitting}>
      <button class="rate-close" onclick={closeModal} aria-label="Close">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          ><line x1="18" y1="6" x2="6" y2="18" /><line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          /></svg
        >
      </button>

      <div class="rate-emoji">
        {#if activeRating === 0}😶{:else if activeRating === 1}😕{:else if activeRating === 2}😐{:else if activeRating === 3}🙂{:else if activeRating === 4}😊{:else}🤩{/if}
      </div>

      <h2 id="rate-modal-title" class="rate-title">How was your ride?</h2>
      <p class="rate-label">
        {ratingLabels[activeRating] || "Tap a star to rate"}
      </p>

      <div class="rate-stars">
        {#each stars as star, i}
          <button
            type="button"
            onclick={() => (rating = star)}
            onmouseenter={() => (hoverRating = star)}
            onmouseleave={() => (hoverRating = 0)}
            class="rate-star"
            class:rate-star-active={activeRating >= star}
            class:rate-star-selected={rating >= star && !hoverRating}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            bind:this={starRefs[i]}
            style="animation-delay: {i * 50}ms"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={activeRating >= star ? "currentColor" : "none"}
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
          </button>
        {/each}
      </div>

      {#if rating > 0}
        <div class="rate-comment-wrap rate-slide-in">
          <textarea
            bind:value={comment}
            placeholder="Tell us more about your experience… (optional)"
            class="rate-textarea"
            rows="3"
          ></textarea>
        </div>
      {/if}

      <div class="rate-actions">
        <button class="rate-btn-cancel" onclick={closeModal}>Not now</button>
        <button class="rate-btn-submit" onclick={submit} disabled={!canSubmit}>
          {#if submitting}
            <div class="rate-spinner"></div>
            Submitting…
          {:else}
            Submit Rating
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rate-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
    padding: 1rem 1.5rem;
    border: none;
    border-radius: 16px;
    font-size: 1rem;
    font-weight: 700;
    font-family: inherit;
    color: white;
    background: linear-gradient(135deg, oklch(0.7 0.18 80), oklch(0.62 0.2 50));
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.2s ease;
    box-shadow: 0 2px 12px oklch(0.62 0.2 50 / 0.2);
  }
  .rate-trigger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px oklch(0.62 0.2 50 / 0.3);
  }
  .rate-trigger:active {
    transform: translateY(0) scale(0.98);
  }

  .rate-overlay {
    position: fixed;
    inset: 0;
    background: oklch(0.15 0.02 260 / 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
    animation: rate-ov-in 0.25s ease-out;
  }
  @keyframes rate-ov-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (min-width: 640px) {
    .rate-overlay {
      align-items: center;
    }
    .rate-modal {
      border-radius: 24px !important;
    }
  }

  .rate-modal {
    background: white;
    border-radius: 24px 24px 20px 20px;
    padding: 2rem 1.5rem 1.5rem;
    width: 100%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 -8px 40px oklch(0.2 0.02 260 / 0.15);
    animation: rate-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    transition: filter 0.3s ease;
  }
  .rate-submitting {
    filter: brightness(0.97);
    pointer-events: none;
  }
  @keyframes rate-up {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .rate-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: none;
    background: oklch(0.96 0.005 260);
    color: oklch(0.5 0.02 260);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .rate-close:hover {
    background: oklch(0.93 0.005 260);
  }

  .rate-emoji {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    filter: drop-shadow(0 2px 4px oklch(0.3 0.02 260 / 0.1));
  }
  .rate-title {
    font-size: 1.2rem;
    font-weight: 750;
    color: oklch(0.18 0.02 260);
    margin: 0 0 0.15rem;
    letter-spacing: -0.02em;
  }
  .rate-label {
    font-size: 0.85rem;
    color: oklch(0.55 0.02 260);
    margin: 0 0 1.25rem;
    min-height: 1.2em;
  }

  .rate-stars {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .rate-star {
    border: none;
    background: none;
    padding: 0.25rem;
    cursor: pointer;
    color: oklch(0.88 0.01 260);
    transition:
      color 0.15s ease,
      transform 0.15s ease;
    border-radius: 8px;
    animation: rate-star-in 0.3s ease-out both;
  }
  .rate-star:hover {
    transform: scale(1.15);
  }
  .rate-star:active {
    transform: scale(0.95);
  }
  .rate-star-active {
    color: oklch(0.75 0.18 80);
  }
  .rate-star-selected {
    color: oklch(0.7 0.2 65);
  }
  @keyframes rate-star-in {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .rate-comment-wrap {
    margin-bottom: 1.25rem;
  }
  .rate-textarea {
    width: 100%;
    padding: 0.85rem 1rem;
    border: 1.5px solid oklch(0.91 0.005 260);
    border-radius: 14px;
    font-size: 0.88rem;
    color: oklch(0.2 0.02 260);
    resize: none;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }
  .rate-textarea::placeholder {
    color: oklch(0.7 0.01 260);
  }
  .rate-textarea:focus {
    border-color: oklch(0.7 0.18 80);
    box-shadow: 0 0 0 3px oklch(0.7 0.18 80 / 0.08);
  }

  .rate-actions {
    display: flex;
    gap: 0.6rem;
  }
  .rate-btn-cancel {
    flex: 1;
    padding: 0.8rem;
    border: 1.5px solid oklch(0.91 0.005 260);
    border-radius: 14px;
    background: white;
    font-size: 0.88rem;
    font-weight: 600;
    color: oklch(0.45 0.02 260);
    cursor: pointer;
    font-family: inherit;
  }
  .rate-btn-cancel:hover {
    background: oklch(0.97 0.003 260);
  }
  .rate-btn-submit {
    flex: 1.5;
    padding: 0.8rem;
    border: none;
    border-radius: 14px;
    font-size: 0.88rem;
    font-weight: 700;
    font-family: inherit;
    color: white;
    background: linear-gradient(135deg, oklch(0.7 0.18 80), oklch(0.6 0.2 55));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease,
      opacity 0.15s ease;
  }
  .rate-btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 18px oklch(0.6 0.2 55 / 0.3);
  }
  .rate-btn-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .rate-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: rate-spin 0.6s linear infinite;
  }
  @keyframes rate-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .rate-slide-in {
    animation: rate-si 0.25s ease-out;
  }
  @keyframes rate-si {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
