<script lang="ts">
  export let data: { requests: any[], vehicles?: any[], organizations?: any[], error?: string }
</script>

<h1 class="text-2xl font-bold mb-4">Actor Requests</h1>

{#if data.error}
  <div class="mb-4 p-3 bg-red-50 text-red-700 rounded">{data.error}</div>
{/if}

{#if data.requests.length === 0}
  <p>No pending requests.</p>
{:else}
  <ul class="space-y-4">
    {#each data.requests as r}
      <li class="border rounded p-3">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <div class="font-medium">{r.requested_type}</div>
            <div class="text-sm text-slate-600">{r.payload ? JSON.stringify(r.payload) : ''}</div>
          </div>
          <form method="post" class="flex items-center gap-2">
            <input type="hidden" name="request_id" value={r.id} />
            <select name="binding_type" class="border rounded px-2 py-1 text-sm" id={"binding_type_" + r.id}>
              <option value="">No binding</option>
              <option value="driver_assignment">Driver assignment (vehicle)</option>
              <option value="conductor_assignment">Conductor assignment (vehicle)</option>
              <option value="fleet_ownership">Fleet ownership (vehicle)</option>
              <option value="organization_member">Organization member (org)</option>
            </select>

            <!-- hidden input that will receive selected target id from selects -->
            <input type="hidden" id={"binding_target_" + r.id} name="binding_target" />

            <!-- vehicle select (if available) -->
            {#if data.vehicles && data.vehicles.length > 0}
              <select class="border rounded px-2 py-1 text-sm" on:change={(e) => (document.getElementById('binding_target_' + r.id) as HTMLInputElement).value = (e.target as HTMLSelectElement).value}>
                <option value="">Select vehicle (optional)</option>
                {#each data.vehicles as v}
                  <option value={v.id}>{v.name}</option>
                {/each}
              </select>
            {/if}

            <!-- organization select (if available) -->
            {#if data.organizations && data.organizations.length > 0}
              <select class="border rounded px-2 py-1 text-sm" on:change={(e) => (document.getElementById('binding_target_' + r.id) as HTMLInputElement).value = (e.target as HTMLSelectElement).value}>
                <option value="">Select organization (optional)</option>
                {#each data.organizations as o}
                  <option value={o.id}>{o.name}</option>
                {/each}
              </select>
            {/if}

            <!-- fallback free-text input if no lists provided -->
            {#if !(data.vehicles && data.vehicles.length > 0) && !(data.organizations && data.organizations.length > 0)}
              <input name="binding_target" placeholder="target UUID (vehicle/org)" class="border rounded px-2 py-1 text-sm" />
            {/if}

            <button name="_action" value="approve" class="btn btn-primary">Approve</button>
          </form>
        </div>
      </li>
    {/each}
  </ul>
{/if}
