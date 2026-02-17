<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/features/race/style.css';
  // references to DOM elements
  let nameInput: HTMLInputElement;
  let colorPicker: HTMLDivElement;
  let startButton: HTMLDivElement;

  // reactive variables
  let playerName = '';
  let color = 0;

  // keep original submodule JS accessible
  let raceModule: any;

  onMount(async () => {
    // dynamically import the JS from lib/features/race
    raceModule = await import('$lib/features/race/script.js');

    // call any init functions the submodule exposes
    if (raceModule.init) raceModule.init();

    // if original code expects document.getElementById, it will still work
  });
</script>

<!-- HEAD content mostly removed; handled globally in Svelte layout -->

<div id="trackcode" class="data">
  1,5/0,7 0,7/-1,8 ...
</div>

<div id="fore">
  <div id="version">v1.1.3.14</div>
  <div class="title" id="title">Online Racing Game!</div>

  <div class="menuitem title">
    Pick a name:<br/>
    <input
      bind:this={nameInput}
      bind:value={playerName}
      class="title"
      placeholder="Name"
    />
  </div>

  <div class="menuitem title">
    Choose a color:<br/>
    <div
      bind:this={colorPicker}
      id="colorpicker"
      on:mousemove={(e) => {
        if (e.buttons === 1) {
          const x = e.clientX - colorPicker.getBoundingClientRect().left;
          color = Math.floor((x / colorPicker.clientWidth) * 360);
          if (raceModule?.updateColor) raceModule.updateColor(color);
        }
      }}
    >
      <div id="slider"></div>
    </div>
  </div>

  <div class="menuitem title">
    <div
      bind:this={startButton}
      id="start"
      on:click={() => raceModule?.menu2?.()}
    >
      Start!
    </div>
  </div>
</div>

<!-- styles -->

