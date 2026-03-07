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
      height: 100%;
      background: var(--ink, #0a0a14); /* your dark color */
    }

    body {
      font-family: var(--font-body);
      color: var(--text-1);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* your radial gradients – moved here so they cover whole viewport */
    body::before {
      content: "";
      position: fixed;
      bottom: -120px;
      left: -120px;
      width: 500px;
      height: 500px;
      background: radial-gradient(
        circle,
        rgba(242, 101, 34, 0.07),
        transparent 65%
      );
      pointer-events: none;
      z-index: -2;
    }

    body::after {
      content: "";
      position: fixed;
      top: -80px;
      right: -80px;
      width: 400px;
      height: 400px;
      background: radial-gradient(
        circle,
        rgba(0, 176, 155, 0.06),
        transparent 65%
      );
      pointer-events: none;
      z-index: -2;
    }
  </style>
</svelte:head>

<main class="full-onboard-wrapper">
  {@render children()}
</main>

<style>
  .full-onboard-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    min-height: 100vh;
  }
</style>
