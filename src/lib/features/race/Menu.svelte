<script>
  import { onMount } from "svelte"
  import {
    gameCode,
    gameStarted,
    me,
    players,
    trackCode,
    menuVisible,
    vrMode,
    mobile,
  } from "./stores/stores"
  import { getDatabase, firebaseRef } from "./firebase"
  import { CAR_POSITIONS } from "./constants"

  let nameInput = ""
  let colorHue = Math.floor(Math.random() * 360)
  let codeInput = ""
  let view = "main" // 'main', 'host', 'join', 'game'

  $effect(() => {
    if ($gameStarted) view = "game"
  })

  function updateColor() {
    document.documentElement.style.setProperty(
      "--player-color",
      `hsl(${colorHue}, 100%, 50%)`,
    )
  }

  async function hostGame() {
    const db = getDatabase()
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let code = ""
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * 26)]
    // Check if code exists
    const snapshot = await firebaseRef.once(firebaseRef.ref(db, code))
    if (snapshot.exists()) {
      // try again
      hostGame()
      return
    }
    await firebaseRef.set(firebaseRef.ref(db, code), {
      status: 0,
      players: {},
      map: $trackCode,
      timestamp: Date.now(),
    })
    gameCode.set(code)
    // Set up listeners...
    view = "lobby"
  }

  // ... more functions: joinGame, startGame, etc.
</script>

{#if $menuVisible}
  <div class="menu">
    {#if view === "main"}
      <div class="title">CAR GAME</div>
      <div class="menuitem" on:click={() => (view = "host")}>Host a game</div>
      <div class="menuitem" on:click={() => (view = "join")}>Join a game</div>
      <div class="settings">
        <input type="text" bind:value={nameInput} placeholder="Your name" />
        <input
          type="range"
          min="0"
          max="360"
          bind:value={colorHue}
          on:input={updateColor}
        />
        <label>
          <input type="checkbox" bind:checked={$vrMode} /> VR Mode
        </label>
      </div>
    {:else if view === "host"}
      <div class="info">Your game code: <span id="code">{$gameCode}</span></div>
      <div class="menuitem" on:click={startGame}>Start!</div>
    {:else if view === "join"}
      <div class="info">Enter code:</div>
      <input
        type="text"
        maxlength="4"
        bind:value={codeInput}
        on:keyup={checkCode}
      />
    {:else if view === "lobby"}
      <div class="info">Waiting for host to start...</div>
      <div class="players">
        {#each Object.values($players) as p}
          <div>{p.data.name}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .menu {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  /* ... more styles */
</style>
