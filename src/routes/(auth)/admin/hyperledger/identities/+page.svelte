<script lang="ts">
  // src/routes/admin/hyperledger/identities/+page.svelte
  import { createDialog, melt } from "@melt-ui/svelte"
  import { enhance } from "$app/forms"
  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import {
    CircleDot,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Search,
    SlidersHorizontal,
    X,
  } from "lucide-svelte"
  import type { PageData, ActionData } from "./$types"

  export let data: PageData
  export let form: ActionData

  // Revoke confirmation dialog
  const {
    elements: {
      trigger: dialogTrigger,
      overlay,
      content: dialogContent,
      close,
      portalled,
    },
    states: { open },
  } = createDialog({ role: "alertdialog" })

  let revokeTarget: {
    userId: string
    role: string
    entityType: string
  } | null = null
  let selectedReason = "privilegewithdrawn"

  function openRevoke(id: (typeof data.identities)[0]) {
    revokeTarget = {
      userId: id.userId,
      role: id.attributes?.role ?? "unknown",
      entityType: id.attributes?.role === "iot-device" ? "device" : "driver",
    }
    $open = true
  }

  const reasons = [
    { value: "privilegewithdrawn", label: "Privilege withdrawn (offboarding)" },
    { value: "keycompromise", label: "Key compromise" },
    { value: "cessationofoperation", label: "Cessation of operation" },
    { value: "affiliationchange", label: "Affiliation change" },
    { value: "superseded", label: "Superseded" },
    { value: "unspecified", label: "Unspecified" },
  ]

  const roleColour: Record<string, string> = {
    "org-admin": "bg-violet-100 text-violet-700",
    "fleet-manager": "bg-blue-100   text-blue-700",
    driver: "bg-emerald-100 text-emerald-700",
    "iot-device": "bg-amber-100  text-amber-700",
    admin: "bg-rose-100   text-rose-700",
    unknown: "bg-gray-100   text-gray-600",
  }

  function roleClass(role: string) {
    return roleColour[role] ?? roleColour.unknown
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Filter navigation
  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams($page.url.searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    goto(`?${params.toString()}`)
  }
</script>

<div use:melt={$portalled}>
  {#if $open}
    <!-- Overlay -->
    <div use:melt={$overlay} class="fixed inset-0 z-40 bg-black/40" />
    <!-- Dialog -->
    <div
      use:melt={$dialogContent}
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
    >
      <div class="mb-4 flex items-start gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100"
        >
          <AlertTriangle class="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-gray-900">Revoke identity</h2>
          <p class="mt-0.5 text-sm text-gray-500">
            This will revoke <span class="font-mono font-medium"
              >{revokeTarget?.userId}</span
            >
            at the Fabric CA level. This cannot be undone.
          </p>
        </div>
      </div>

      <form
        method="POST"
        action="?/revoke"
        use:enhance={() => {
          return async ({ result, update }) => {
            await update()
            if (result.type === "success") $open = false
          }
        }}
        class="space-y-4"
      >
        <input type="hidden" name="userId" value={revokeTarget?.userId ?? ""} />
        <input
          type="hidden"
          name="entityType"
          value={revokeTarget?.entityType ?? "driver"}
        />

        <div>
          <label
            for="reason"
            class="block text-sm font-medium text-gray-700 mb-1">Reason</label
          >
          <select
            id="reason"
            name="reason"
            bind:value={selectedReason}
            class="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            {#each reasons as r}
              <option value={r.value}>{r.label}</option>
            {/each}
          </select>
        </div>

        <div class="flex gap-3 justify-end">
          <button
            type="button"
            use:melt={$close}
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Revoke identity
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<div class="min-h-screen bg-gray-50 p-6 lg:p-8">
  <div class="mx-auto max-w-5xl">
    <!-- Header -->
    <div class="mb-6">
      <a
        href="/admin/hyperledger"
        class="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft class="h-3.5 w-3.5" /> Back to dashboard
      </a>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">
            Enrolled identities
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {data.identities.length} identities shown
          </p>
        </div>
        <a
          href="/admin/hyperledger/enroll"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Enroll new
        </a>
      </div>
    </div>

    <!-- Action feedback -->
    {#if form?.success}
      <div
        class="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"
      >
        <CircleDot class="h-4 w-4" />
        Identity <span class="font-mono font-medium">{form.revokedUserId}</span> revoked.
      </div>
    {/if}
    {#if form && !form.success && form.error}
      <div
        class="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700"
      >
        <XCircle class="h-4 w-4" />
        {form.error}
      </div>
    {/if}

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
      >
        <Search class="h-4 w-4 text-gray-400" />
        <span class="text-sm text-gray-400">Filter by:</span>
      </div>

      <select
        on:change={(e) => applyFilter("role", e.currentTarget.value)}
        class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">All roles</option>
        {#each data.roles as r}
          <option value={r} selected={data.filters.filterRole === r}>{r}</option
          >
        {/each}
      </select>

      <select
        on:change={(e) => applyFilter("org", e.currentTarget.value)}
        class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
      >
        <option value="">All orgs</option>
        {#each data.orgs as o}
          <option value={o} selected={data.filters.filterOrg === o}>{o}</option>
        {/each}
      </select>

      <label
        class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer"
      >
        <input
          type="checkbox"
          checked={data.filters.includeRevoked}
          on:change={(e) =>
            applyFilter("revoked", e.currentTarget.checked ? "true" : "")}
        />
        Include revoked
      </label>
    </div>

    <!-- Table -->
    <div
      class="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs uppercase tracking-wide text-gray-400">
            <th class="px-4 py-3 font-medium">User ID</th>
            <th class="px-4 py-3 font-medium">Role</th>
            <th class="px-4 py-3 font-medium">Org</th>
            <th class="px-4 py-3 font-medium">MSP</th>
            <th class="px-4 py-3 font-medium">Enrolled</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each data.identities as id}
            <tr class="hover:bg-gray-50/50">
              <td
                class="px-4 py-3 font-mono text-xs text-gray-700 max-w-[180px] truncate"
                >{id.userId}</td
              >
              <td class="px-4 py-3">
                <span
                  class={`rounded-full px-2 py-0.5 text-xs font-medium ${roleClass(id.attributes?.role)}`}
                >
                  {id.attributes?.role ?? "—"}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600"
                >{id.attributes?.orgId ?? "—"}</td
              >
              <td class="px-4 py-3 font-mono text-xs text-gray-500"
                >{id.mspId}</td
              >
              <td class="px-4 py-3 text-gray-500">{fmt(id.enrolledAt)}</td>
              <td class="px-4 py-3">
                {#if id.revoked}
                  <span class="flex items-center gap-1 text-rose-600 text-xs">
                    <XCircle class="h-3.5 w-3.5" /> Revoked
                  </span>
                {:else}
                  <span
                    class="flex items-center gap-1 text-emerald-600 text-xs"
                  >
                    <CircleDot class="h-3.5 w-3.5" /> Active
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3">
                {#if !id.revoked && id.userId !== "admin"}
                  <button
                    on:click={() => openRevoke(id)}
                    class="text-xs text-rose-600 hover:text-rose-800 hover:underline"
                  >
                    Revoke
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
          {#if data.identities.length === 0}
            <tr>
              <td
                colspan="7"
                class="px-4 py-10 text-center text-sm text-gray-400"
              >
                No identities match the current filters.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
