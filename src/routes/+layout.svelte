<script lang="ts">
  import "../app.css"
  import { navigating } from "$app/stores"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()
</script>

<style>
  .nav-progress {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 2px;
    z-index: 200;
    background: linear-gradient(
      90deg,
      var(--orange) 0%,
      rgba(242,101,34,0.6) 60%,
      rgba(242,101,34,0.1) 100%
    );
    box-shadow: 0 0 12px rgba(242,101,34,0.5), 0 0 32px rgba(242,101,34,0.2);
    transform-origin: left center;
  }

  /* Leading glow dot at the advancing edge */
  .nav-progress::after {
    content: '';
    position: absolute;
    right: 0; top: 50%;
    transform: translateY(-50%);
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--orange);
    box-shadow: 0 0 8px 2px rgba(242,101,34,0.8);
  }
</style>

{#if $navigating}
  <!--
    Navigation progress bar:
    - 100ms delay so instant page loads don't flash at all
    - 12s duration covers even slow 3G connections
    - expoOut easing: fast early progress for snappy feel, slow tail for long loads
    - 2px orange gradient line + leading glow dot matches brand system
  -->
  <div
    class="nav-progress"
    in:slide={{ delay: 100, duration: 12000, axis: "x", easing: expoOut }}
  ></div>
{/if}

{@render children?.()}