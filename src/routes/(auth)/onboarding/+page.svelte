<script>
  import { ROLES } from "$lib/constants"
  import { fly, fade, slide } from "svelte/transition"
  import { enhance } from "$app/forms"

  let step = $state(1)
  let selectedRole = $state("")
  let selectedSacco = $state(null)
  let searchState = $state("")
  let loading = $state(false)

  export let form // for server errors

  const PRO_ROLES = [ROLES.DRIVER, ROLES.CONDUCTOR, ROLES.STAGE_OPERATOR]

  let saccos = [
    "sxcntqnt",
    "2NK Sacco",
    "Super Metro",
    "4NTE",
    "Mololine",
    "Other",
  ]

  let filteredSaccos = $derived(
    saccos.filter((s) => s.toLowerCase().includes(searchState.toLowerCase())),
  )

  function skipSaccoVerification() {
    step++
  }
</script>

<div
  class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4"
>
  <div
    class="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-slate-100"
  >
    <!-- STEP 1 -->
    {#if step === 1}
      <div in:fly={{ y: 20 }}>
        <h1 class="text-3xl font-black text-slate-900 mb-2">
          Identify Your Role
        </h1>
        <p class="text-slate-500 mb-8">How will you be using the platform?</p>

        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2"
        >
          {#each Object.values(ROLES) as role}
            <button
              type="button"
              on:click={() => (selectedRole = role)}
              class="p-4 rounded-xl border-2 text-left transition-all
                     {selectedRole === role
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}"
            >
              <span class="block font-bold text-slate-800 capitalize">
                {role.replace("_", " ")}
              </span>
              <span class="text-xs text-slate-500">
                Access {role.toLowerCase()} tools & features
              </span>
            </button>
          {/each}
        </div>

        <button
          type="button"
          disabled={!selectedRole}
          on:click={() => step++}
          class="w-full mt-8 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      <!-- STEP 2 (Verification for PRO roles) -->
    {:else if step === 2 && PRO_ROLES.includes(selectedRole)}
      <div in:fly={{ x: 30 }}>
        <h2 class="text-2xl font-bold mb-2">Verification Required</h2>
        <p class="text-slate-500 mb-6">
          As a {selectedRole.replace("_", " ")}, we need to verify your
          credentials.
        </p>

        <div class="flex gap-4 mt-10">
          <button
            type="button"
            on:click={() => step--}
            class="flex-1 py-3 border border-slate-300 rounded-xl"
          >
            Back
          </button>
          <button
            type="button"
            on:click={() => step++}
            class="flex-1 py-3 bg-black text-white rounded-xl"
          >
            Next
          </button>
        </div>
      </div>

      <!-- SACCO STEP -->
    {:else if step === (PRO_ROLES.includes(selectedRole) ? 3 : 2)}
      <div in:slide>
        <h2 class="text-xl font-bold mb-4">Boost your Profile (Optional)</h2>

        <input
          bind:value={searchState}
          placeholder="Search for your SACCO..."
          class="w-full p-3 border rounded-xl mb-4"
        />

        {#if searchState && !selectedSacco}
          <div class="border rounded-xl shadow max-h-60 overflow-y-auto">
            {#each filteredSaccos as sacco}
              <button
                type="button"
                on:click={() => {
                  selectedSacco = sacco
                  searchState = sacco
                }}
                class="w-full p-3 text-left hover:bg-blue-50"
              >
                {sacco}
              </button>
            {/each}
          </div>
        {/if}

        <div class="flex flex-col gap-3 mt-6">
          <button
            type="button"
            on:click={() => step++}
            class="w-full bg-blue-600 text-white py-3 rounded-xl"
          >
            Continue
          </button>

          <button
            type="button"
            on:click={skipSaccoVerification}
            class="text-sm text-slate-500"
          >
            I'll do this later
          </button>
        </div>
      </div>

      <!-- FINAL STEP -->
    {:else}
      <div in:fade class="text-center">
        {#if form?.message}
          <p class="text-red-500 mb-4">{form.message}</p>
        {/if}

        <h2 class="text-2xl font-bold mb-6">You're all set!</h2>

        <!-- 🔥 NATIVE FORM SUBMISSION -->
        <form
          method="POST"
          action="?/completeOnboarding"
          use:enhance={({ pending }) => {
            loading = pending
          }}
        >
          <!-- Hidden inputs -->
          <input type="hidden" name="role" value={selectedRole} />
          <input type="hidden" name="sacco" value={selectedSacco || ""} />

          <button
            type="submit"
            disabled={loading}
            class="w-full bg-blue-600 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? "Setting up your account..." : "Enter Dashboard"}

            {#if loading}
              <div
                class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"
              />
            {/if}
          </button>
        </form>
      </div>
    {/if}
  </div>
</div>
