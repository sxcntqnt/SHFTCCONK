<script lang="ts">
  interface Props {
    open: boolean
    title: string
    close: () => void
    children?: import("svelte").Snippet
  }
  let { open, title, close, children }: Props = $props()

  // Close on Escape key
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close()
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    class="overlay"
    onclick={close}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <span class="modal-title" id="modal-title">{title}</span>
        <button class="modal-close" onclick={close} aria-label="Close">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        {#if children}{@render children()}{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 20px;
    animation: fade-in 0.18s ease both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    width: 100%;
    max-width: 520px;
    background: #13131e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 22px;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(242, 101, 34, 0.08);
    overflow: hidden;
    animation: modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(12px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Top accent */
  .modal::before {
    content: "";
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 101, 34, 0.55),
      transparent
    );
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .modal-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }

  .modal-close {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-3);
    transition:
      background 0.15s,
      color 0.15s;
  }
  .modal-close:hover {
    background: rgba(248, 113, 113, 0.1);
    border-color: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .modal-body {
    padding: 24px;
  }
</style>
