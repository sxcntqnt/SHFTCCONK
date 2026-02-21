<script lang="ts">
  export let className: string = '';
</script>

<div class={`bg-white/30 backdrop-blur-xl border border-white/20 rounded-3xl shadow-lg p-6 ${className}`}>
  <slot />
</div>

<style>
  /* Optional: enhance the frosted glass look for dark/light mode */
  div {
    transition: all 0.2s ease-in-out;
  }

  div:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
</style>