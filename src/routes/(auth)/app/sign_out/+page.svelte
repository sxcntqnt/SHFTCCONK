<script lang="ts">
  import { goto } from "$app/navigation"
  import { onMount } from "svelte"
  import posthog from "posthog-js"

  let { data } = $props()

  let message = $state("Signing out....")

  // on mount, sign out
  onMount(() => {
    // Capture sign-out event before resetting PostHog identity
    posthog.capture("user_signed_out")
    posthog.reset()

    data.supabase.auth.signOut().then(({ error }: { error: any }) => {
      if (error) {
        message = "There was an issue signing out."
      } else {
        goto("/")
      }
    })
  })
</script>

<h1 class="text-2xl font-bold m-6 mx-auto my-auto">{message}</h1>
