<script lang="ts">
  // src/routes/admin/hyperledger/enroll/+page.svelte
  import { createTabs, melt } from "@melt-ui/svelte"
  import { enhance } from "$app/forms"
  import {
    Users,
    Cpu,
    ArrowLeft,
    Copy,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
  } from "lucide-svelte"
  import type { ActionData } from "./$types"

  export let form: ActionData

  const {
    elements: { root, list, trigger, content },
  } = createTabs({ defaultValue: "user" })

  let showPrivateKey = false
  let copied = false

  function copyKey(text: string) {
    navigator.clipboard.writeText(text)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  // Reset on tab change
  $: activeTab = "user"
</script>

<div class="min-h-screen bg-gray-50 p-6 lg:p-8">
  <div class="mx-auto max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <a
        href="/admin/hyperledger"
        class="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft class="h-3.5 w-3.5" /> Back to dashboard
      </a>
      <h1 class="text-2xl font-semibold text-gray-900">Enroll identity</h1>
      <p class="mt-1 text-sm text-gray-500">
        Register and enroll a user, driver, or IoT device with the Fabric CA.
      </p>
    </div>

    <!-- Success state (device) — show private key once -->
    {#if form?.success && form.type === "device"}
      <div class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div class="mb-3 flex items-center gap-2 text-emerald-700">
          <CheckCircle class="h-5 w-5" />
          <span class="font-medium">Device enrolled: {form.deviceId}</span>
        </div>
        <p class="mb-3 text-sm text-emerald-600">
          Transmit the private key to the device securely (mTLS provisioning).
          It will not be shown again.
        </p>
        <div class="rounded-lg border border-emerald-200 bg-white p-3">
          <div class="mb-1.5 flex items-center justify-between">
            <span
              class="text-xs font-medium text-gray-500 uppercase tracking-wide"
              >Private key</span
            >
            <div class="flex gap-2">
              <button
                on:click={() => (showPrivateKey = !showPrivateKey)}
                class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {#if showPrivateKey}
                  <EyeOff class="h-3.5 w-3.5" /> Hide
                {:else}
                  <Eye class="h-3.5 w-3.5" /> Reveal
                {/if}
              </button>
              <button
                on:click={() => copyKey(form.privateKey)}
                class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <Copy class="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          {#if showPrivateKey}
            <pre
              class="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-xs text-gray-700 font-mono">{form.privateKey}</pre>
          {:else}
            <p class="text-xs text-gray-400 italic">
              Click "Reveal" to show the private key.
            </p>
          {/if}
        </div>
        <a
          href="/admin/hyperledger/enroll"
          class="mt-3 block text-sm text-indigo-600 hover:underline"
        >
          Enroll another →
        </a>
      </div>

      <!-- Success state (user) -->
    {:else if form?.success && form.type === "user"}
      <div
        class="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
      >
        <CheckCircle class="h-5 w-5 text-emerald-600" />
        <div>
          <p class="font-medium text-emerald-700">
            User enrolled: {form.userId}
          </p>
          <p class="text-sm text-emerald-600">
            MSP: {form.mspId} · Identity stored in Vault.
          </p>
        </div>
      </div>
    {/if}

    <!-- Error state -->
    {#if form && !form.success && form.error}
      <div
        class="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4"
      >
        <AlertCircle class="h-5 w-5 shrink-0 text-rose-600" />
        <p class="text-sm text-rose-700">{form.error}</p>
      </div>
    {/if}

    <!-- Tabs -->
    <div
      use:melt={$root}
      class="rounded-xl border border-gray-100 bg-white shadow-sm"
    >
      <div
        use:melt={$list}
        class="flex border-b border-gray-100 px-4"
        aria-label="Enroll type"
      >
        {#each [{ id: "user", label: "User / Driver", icon: Users }, { id: "device", label: "IoT Device", icon: Cpu }] as tab}
          <button
            use:melt={$trigger(tab.id)}
            class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors
              data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600
              data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500
              data-[state=inactive]:hover:text-gray-700"
          >
            <svelte:component this={tab.icon} class="h-4 w-4" />
            {tab.label}
          </button>
        {/each}
      </div>

      <!-- User form -->
      <div use:melt={$content("user")} class="p-6">
        <form method="POST" action="?/enrollUser" use:enhance class="space-y-5">
          <div>
            <label for="userId" class="block text-sm font-medium text-gray-700"
              >User ID</label
            >
            <p class="text-xs text-gray-400 mb-1">
              Must match your app's user ID (e.g. UUID or email)
            </p>
            <input
              id="userId"
              name="userId"
              type="text"
              required
              placeholder="user-abc-123"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700"
              >Role</label
            >
            <select
              id="role"
              name="role"
              required
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select role…</option>
              <option value="driver">Driver</option>
              <option value="fleet-manager">Fleet manager</option>
              <option value="org-admin">Org admin</option>
            </select>
          </div>
          <div>
            <label for="orgId" class="block text-sm font-medium text-gray-700"
              >Org ID</label
            >
            <input
              id="orgId"
              name="orgId"
              type="text"
              required
              placeholder="org-xyz"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              for="affiliation"
              class="block text-sm font-medium text-gray-700"
            >
              Affiliation <span class="text-gray-400 font-normal"
                >(optional)</span
              >
            </label>
            <input
              id="affiliation"
              name="affiliation"
              type="text"
              placeholder="platform.users"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Enroll user
          </button>
        </form>
      </div>

      <!-- Device form -->
      <div use:melt={$content("device")} class="p-6">
        <div
          class="mb-5 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700"
        >
          The private key will be shown <strong>once</strong> after enrollment. Have
          a secure transmission channel ready before submitting.
        </div>
        <form
          method="POST"
          action="?/enrollDevice"
          use:enhance
          class="space-y-5"
        >
          <div>
            <label
              for="deviceId"
              class="block text-sm font-medium text-gray-700">Device ID</label
            >
            <input
              id="deviceId"
              name="deviceId"
              type="text"
              required
              placeholder="dev-tracker-001"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              for="devOrgId"
              class="block text-sm font-medium text-gray-700">Org ID</label
            >
            <input
              id="devOrgId"
              name="orgId"
              type="text"
              required
              placeholder="org-xyz"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              for="vehicleId"
              class="block text-sm font-medium text-gray-700"
            >
              Vehicle ID <span class="text-gray-400 font-normal"
                >(optional)</span
              >
            </label>
            <input
              id="vehicleId"
              name="vehicleId"
              type="text"
              placeholder="veh-001"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              for="location"
              class="block text-sm font-medium text-gray-700"
            >
              Location <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Nairobi depot"
              class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Enroll device
          </button>
        </form>
      </div>
    </div>
  </div>
</div>
