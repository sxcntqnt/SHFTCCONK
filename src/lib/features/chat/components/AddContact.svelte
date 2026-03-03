<script lang="ts">
  import axios from "axios"

  interface Props {
    onContactAdded: (username: string) => void
  }
  let { onContactAdded }: Props = $props()

  let username = $state("")
  let error = $state("")
  let isLoading = $state(false)

  const API = import.meta.env.VITE_API_URL || "http://localhost:8080"

  async function tryAdd() {
    if (!username.trim() || isLoading) return
    isLoading = true
    error = ""
    try {
      const res = await axios.post(`${API}/verify-contact`, {
        username: username.trim(),
      })
      if (res.data?.status) {
        onContactAdded(username.trim())
        username = ""
      } else {
        error = "User not found"
      }
    } catch {
      error = "Something went wrong"
    } finally {
      isLoading = false
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      tryAdd()
    }
  }
</script>

<div class="add-wrap">
  <div class="input-row">
    <input
      class="add-field"
      bind:value={username}
      placeholder="Add by username…"
      onkeydown={onKeydown}
      disabled={isLoading}
    />
    <button
      class="add-btn"
      onclick={tryAdd}
      disabled={isLoading || !username.trim()}
    >
      {#if isLoading}
        <span class="btn-spinner"></span>
      {:else}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      {/if}
      Add
    </button>
  </div>
  {#if error}
    <span class="add-error">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {error}
    </span>
  {/if}
</div>

<style>
  .add-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-row {
    display: flex;
    gap: 6px;
  }

  .add-field {
    flex: 1;
    padding: 9px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--text-1);
    outline: none;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
    min-width: 0;
  }
  .add-field::placeholder {
    color: var(--text-3);
    font-size: 0.78rem;
  }
  .add-field:focus {
    border-color: rgba(242, 101, 34, 0.4);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1);
  }

  .add-btn {
    padding: 9px 14px;
    background: var(--orange);
    border: none;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 3px 10px rgba(242, 101, 34, 0.25);
    transition:
      background 0.15s,
      transform 0.12s;
  }
  .add-btn:hover:not(:disabled) {
    background: #d95618;
    transform: translateY(-1px);
  }
  .add-btn:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-3);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }

  .btn-spinner {
    width: 11px;
    height: 11px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .add-error {
    font-size: 0.72rem;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 5px;
    animation: shake 0.3s ease;
  }
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
</style>
