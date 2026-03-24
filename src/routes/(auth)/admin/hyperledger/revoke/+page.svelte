<script lang="ts">
  // src/routes/admin/hyperledger/revoke/+page.svelte
  import { enhance } from "$app/forms"
  import { ArrowLeft, ShieldOff, CheckCircle, AlertCircle } from "lucide-svelte"
  import type { PageData, ActionData } from "./$types"

  export let data: PageData
  export let form: ActionData

  const reasons = [
    {
      value: "privilegewithdrawn",
      label: "Privilege withdrawn — offboarding or suspension",
    },
    { value: "keycompromise", label: "Key compromise — credential breach" },
    {
      value: "cessationofoperation",
      label: "Cessation of operation — device decommissioned",
    },
    {
      value: "affiliationchange",
      label: "Affiliation change — moved to different org",
    },
    { value: "superseded", label: "Superseded — replaced by new identity" },
    { value: "unspecified", label: "Unspecified" },
  ]
</script>

<div class="min-h-screen bg-gray-50 p-6 lg:p-8">
  <div class="mx-auto max-w-lg">
    <div class="mb-8">
      <a
        href="/admin/hyperledger/identities"
        class="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft class="h-3.5 w-3.5" /> Back to identities
      </a>
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100"
        >
          <ShieldOff class="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Revoke identity</h1>
          <p class="text-sm text-gray-500">
            Revoke a Fabric CA identity and mark it in Vault.
          </p>
        </div>
      </div>
    </div>

    <!-- Success -->
    {#if form?.success}
      <div
        class="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
      >
        <CheckCircle class="h-5 w-5 text-emerald-600" />
        <div>
          <p class="font-medium text-emerald-700">Identity revoked</p>
          <p class="text-sm text-emerald-600 font-mono">{form.userId}</p>
        </div>
      </div>
    {/if}

    <!-- Error -->
    {#if form && !form.success && form.error}
      <div
        class="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4"
      >
        <AlertCircle class="h-5 w-5 text-rose-600" />
        <p class="text-sm text-rose-700">{form.error}</p>
      </div>
    {/if}

    <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div
        class="mb-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700"
      >
        <strong>Warning:</strong> This action is irreversible. The identity will be
        revoked at the Fabric CA level and flagged in Vault. Any active sessions signed
        by this identity will be rejected by the peer.
      </div>

      <form method="POST" use:enhance class="space-y-5">
        <div>
          <label for="userId" class="block text-sm font-medium text-gray-700"
            >User / Device ID</label
          >
          <input
            id="userId"
            name="userId"
            type="text"
            required
            value={data.prefillUserId}
            placeholder="user-abc-123 or dev-tracker-001"
            class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div>
          <label
            for="entityType"
            class="block text-sm font-medium text-gray-700">Entity type</label
          >
          <select
            id="entityType"
            name="entityType"
            class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="driver">User / driver</option>
            <option value="device">IoT device</option>
            <option value="org">Organisation</option>
          </select>
          <p class="mt-1 text-xs text-gray-400">
            Devices get additionally flagged on-chain.
          </p>
        </div>

        <div>
          <label for="reason" class="block text-sm font-medium text-gray-700"
            >Revocation reason</label
          >
          <select
            id="reason"
            name="reason"
            class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            {#each reasons as r}
              <option value={r.value}>{r.label}</option>
            {/each}
          </select>
        </div>

        <button
          type="submit"
          class="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
        >
          Confirm revocation
        </button>
      </form>
    </div>
  </div>
</div>
