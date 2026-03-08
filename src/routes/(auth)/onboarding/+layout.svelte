<!-- src/routes/(auth)/onboarding/+layout.svelte -->
<!--
  Onboarding layout — full-viewport dark shell with atmospheric gradients.
  
  STYLE FIX: The <svelte:head> body styles were competing with app.css
  and other layouts. Now we own the background via a wrapper div that
  fills the viewport, and use :global() for minimal body overrides.
-->
<script lang="ts">
  let { children } = $props()
</script>

<svelte:head>
  <style>
    /* Minimal body override — just kill margins and set base background.
       The wrapper div below handles the actual styling. */
    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }
  </style>
</svelte:head>

<div class="onboard-shell">
  <!-- Atmospheric gradients as child elements, not pseudo-elements on body -->
  <div class="gradient gradient-warm"></div>
  <div class="gradient gradient-cool"></div>

  <main class="onboard-main">
    {@render children()}
  </main>
</div>

<style>
  .onboard-shell {
    position: relative;
    min-height: 100vh;
    background: var(--ink, #0a0a14);
    overflow: hidden;
    isolation: isolate;
  }

  .onboard-main {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 20px;
  }

  /* Atmospheric gradients — positioned via divs instead of body pseudo-elements */
  .gradient {
    position: fixed;
    pointer-events: none;
    z-index: 0;
  }
  .gradient-warm {
    bottom: -120px;
    left: -120px;
    width: 500px;
    height: 500px;
    background: radial-gradient(
      circle,
      rgba(242, 101, 34, 0.07),
      transparent 65%
    );
  }
  .gradient-cool {
    top: -80px;
    right: -80px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(0, 176, 155, 0.06),
      transparent 65%
    );
  }
</style>
