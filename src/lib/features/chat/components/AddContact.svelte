<script>
  import axios from 'axios';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let usernameInput = $state('');
  let error = $state('');
  let isLoading = $state(false);
  
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  async function tryAddContact() {
    if (!usernameInput.trim()) return;

    isLoading = true;

    try {
      const res = await axios.post(`${API}/verify-contact`, { username: usernameInput.trim() });

      if (res.data?.status) {
        dispatch('contactadded', { username: usernameInput.trim() });
        usernameInput = '';
        error = '';
      } else {
        error = 'User not found';
      }
    } catch (err) {
      error = 'Something went wrong';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="p-3 pb-2">
  <div class="join w-full">
    <input
      type="text"
      placeholder="Add contact by username"
      class="input input-bordered flex-1 join-item"
      bind:value={usernameInput}
      on:keydown={(e) => e.key === 'Enter' && tryAddContact()}
    />
    <button class="btn btn-primary join-item" on:click={tryAddContact} disabled={isLoading}>
      {#if isLoading}
        <span class="loading loading-spinner loading-md"></span>
      {/if}
      Add
    </button>
  </div>

  {#if error}
    <div class="mt-1.5 text-sm text-error">{error}</div>
  {/if}
</div>