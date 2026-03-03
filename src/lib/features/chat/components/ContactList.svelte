<script lang="ts">
  import { formatLastActivity } from "$lib/features/chat/utils/date"

  interface Contact {
    username: string
    last_activity: number
  }

  interface Props {
    contacts: Contact[]
    isLoading: boolean
    fetchError: string
    selected: string
    onSelect: (username: string) => void
  }
  let { contacts, isLoading, fetchError, selected, onSelect }: Props = $props()

  // Generate a consistent hue from a username string
  function avatarHue(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++)
      h = (h * 31 + name.charCodeAt(i)) % 360
    return h
  }
</script>

<div class="list">
  {#if isLoading}
    <div class="list-state">
      <div class="state-spinner"></div>
      Loading contacts…
    </div>
  {:else if fetchError}
    <div class="list-state error-text">{fetchError}</div>
  {:else if contacts.length === 0}
    <div class="list-state">
      No contacts yet<br />
      Add someone above to start chatting
    </div>
  {:else}
    {#each contacts as c (c.username)}
      {@const hue = avatarHue(c.username)}
      <button
        class="contact-btn {selected === c.username ? 'active' : ''}"
        onclick={() => onSelect(c.username)}
      >
        <div class="avatar" style="background: hsl({hue}, 55%, 38%);">
          {c.username.slice(0, 2).toUpperCase()}
        </div>
        <div class="contact-info">
          <div class="contact-name">{c.username}</div>
          <div class="contact-meta">{formatLastActivity(c.last_activity)}</div>
        </div>
      </button>
    {/each}
  {/if}
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
  }

  /* ── States ── */
  .list-state {
    padding: 40px 20px;
    text-align: center;
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.6;
  }
  .state-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 0 auto 12px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .error-text {
    color: #f87171;
  }

  /* ── Contact row ── */
  .contact-btn {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 16px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    transition: background 0.15s;
    position: relative;
  }
  .contact-btn:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .contact-btn.active {
    background: rgba(242, 101, 34, 0.08);
    border-left: 2px solid var(--orange);
    padding-left: 14px;
  }

  /* Active indicator bar */
  .contact-btn.active::after {
    content: "";
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--orange);
  }

  /* Avatar */
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  /* Contact text */
  .contact-info {
    flex: 1;
    min-width: 0;
  }
  .contact-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }
  .contact-btn.active .contact-name {
    color: var(--orange);
  }

  .contact-meta {
    font-size: 0.68rem;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
