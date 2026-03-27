<script lang="ts">
	import { enhance } from '$app/forms';
	import { createDropdownMenu, melt } from '@melt-ui/svelte';
	import { ChevronDown, Users, Building2, User } from 'lucide-svelte'; // or any icon library you prefer

	export let userState;
	export let currentContext: string;

	// Melt UI Dropdown Menu (Runes mode)
	const {
		elements: { trigger, menu, item, separator, arrow },
		states: { open }
	} = createDropdownMenu({
		positioning: { placement: 'bottom-start' },
		forceVisible: true // better for transitions
	});

	// Helper to determine active context label
	$derived let activeLabel = 'Switch Workspace';
	$derived let activeIcon = User;

	if (currentContext === 'passenger') {
		activeLabel = 'Passenger View';
		activeIcon = User;
	} else if (['driver', 'conductor'].includes(currentContext)) {
		activeLabel = 'Crew Dashboard';
		activeIcon = Users;
	} else if (currentContext === 'org_staff') {
		activeLabel = userState.assignments.find(a => a.organization_id)?.org_name || 'Sacco Admin';
		activeIcon = Building2;
	}
</script>

<div class="context-switcher">
  <p class="label text-sm font-medium text-zinc-500 mb-1.5">Workspace</p>

  <form
    method="POST"
    action="/api/auth/switch-context"
    use:enhance
    class="relative"
  >
    <!-- Trigger Button -->
    <button
      use:melt={$trigger}
      class="group flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-zinc-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span class="text-2xl transition-transform group-hover:scale-110">
        {@html $activeIcon ? "" : "🚲"}
        <!-- fallback -->
        <svelte:component
          this={$activeIcon}
          class="h-6 w-6 text-zinc-600 dark:text-zinc-400"
        />
      </span>

      <div class="flex-1 min-w-0">
        <div class="font-semibold text-zinc-900 dark:text-white truncate">
          {activeLabel}
        </div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          Click to switch
        </div>
      </div>

      <ChevronDown
        class="h-5 w-5 text-zinc-400 transition-transform {$open
          ? 'rotate-180'
          : ''}"
      />
    </button>

    <!-- Dropdown Menu -->
    <div
      use:melt={$menu}
      class="z-50 w-72 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <!-- Passenger -->
      <button
        use:melt={$item}
        name="context"
        value="passenger"
        class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 dark:data-[highlighted]:bg-blue-950"
      >
        <span class="text-2xl">🚲</span>
        <span class="font-medium">Passenger View</span>
      </button>

      <!-- Crew (conditional) -->
      {#if userState.actors.some( (a) => ["driver", "conductor"].includes(a.type), )}
        <button
          use:melt={$item}
          name="context"
          value="crew"
          class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 dark:data-[highlighted]:bg-blue-950"
        >
          <span class="text-2xl">🚐</span>
          <span class="font-medium">Crew Dashboard</span>
        </button>
      {/if}

      <div
        use:melt={$separator}
        class="my-1 h-px bg-zinc-200 dark:bg-zinc-800"
      />

      <!-- Organization Assignments -->
      {#each userState.assignments.filter((a) => a.organization_id) as org}
        <button
          use:melt={$item}
          name="context"
          value="orgStaff"
          class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 dark:data-[highlighted]:bg-blue-950"
        >
          <input type="hidden" name="orgId" value={org.organization_id} />
          <span class="text-2xl">🏢</span>
          <span class="font-medium truncate"
            >{org.org_name || "Sacco Admin"}</span
          >
        </button>
      {/each}

      <!-- Optional arrow for premium feel -->
      <div use:melt={$arrow} class="fill-white dark:fill-zinc-900" />
    </div>
  </form>
</div>

<style>
  /* Extra polish if needed – Melt handles most accessibility & positioning */
  .context-switcher {
    width: 100%;
    max-width: 320px;
  }
</style>
