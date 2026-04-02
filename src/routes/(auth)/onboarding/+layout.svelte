<!-- src/routes/(auth)/onboarding/+layout.svelte -->
<script lang="ts">
  let { children } = $props()
</script>

<svelte:head>
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }
  </style>
</svelte:head>

<div class="onboard-shell">
  <!-- Layered atmospheric gradients -->
  <div class="g g-warm-bl"></div>
  <div class="g g-cool-tr"></div>
  <div class="g g-mid"></div>

  <!-- Subtle grid texture -->
  <div class="grid-texture" aria-hidden="true"></div>

  <main class="onboard-main">
    {@render children()}
  </main>
</div>

<style>
  .onboard-shell {
    position: relative;
    min-height: 100vh;
    background: #09090f;
    overflow: hidden;
    isolation: isolate;
  }

  .onboard-main {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
  }

  /* ── Atmospheric gradients ── */
  .g {
    position: fixed;
    pointer-events: none;
    z-index: 0;
    border-radius: 50%;
  }
  .g-warm-bl {
    bottom: -160px;
    left: -160px;
    width: 600px;
    height: 600px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.1),
      transparent 65%
    );
  }
  .g-cool-tr {
    top: -100px;
    right: -100px;
    width: 480px;
    height: 480px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.09),
      transparent 65%
    );
  }
  .g-mid {
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 700px;
    height: 300px;
    background: radial-gradient(
      ellipse,
      rgba(242, 101, 34, 0.03),
      transparent 70%
    );
  }

  /* Subtle dot-grid texture */
  .grid-texture {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.035) 1px,
      transparent 1px
    );
    background-size: 28px 28px;
    mask-image: radial-gradient(
      ellipse 80% 80% at 50% 50%,
      black 20%,
      transparent 100%
    );
  }
</style>
