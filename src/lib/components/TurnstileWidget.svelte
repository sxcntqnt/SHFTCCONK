<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"

  let siteKey: string | null = null
  let turnstileLoaded = false

  if (browser) {
    siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
      ? String(import.meta.env.PUBLIC_TURNSTILE_SITE_KEY)
      : null
    if (!siteKey) console.error("Turnstile site key missing!")
  }

  onMount(() => {
    if (!turnstileLoaded && siteKey && browser) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      script.defer = true
      document.head.appendChild(script)

      script.onload = () => {
        turnstileLoaded = true
      }
      script.onerror = () => console.error("Failed to load Turnstile script")
    }
  })
</script>

{#if siteKey}
  <div class="cf-turnstile" data-sitekey={siteKey}></div>
{:else}
  <p style="color:red;">Turnstile not initialized — site key missing.</p>
{/if}
