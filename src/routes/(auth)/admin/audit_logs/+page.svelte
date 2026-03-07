<script lang="ts">
  type Data = {
    allowed: boolean
    logs: any[]
  }

  let { data }: { data: Data } = $props()
</script>

<h1 class="text-2xl font-bold mb-4">Audit Logs</h1>

{#if !data.allowed}
  <div class="p-4 bg-yellow-50 text-yellow-800 rounded">
    You are not authorized to view audit logs.
  </div>
{:else}
  <div class="mb-4">
    <form method="get" class="flex gap-2">
      <input
        name="event_type"
        placeholder="Event type (actor_request_approved, invite_accepted)"
        class="border px-2 py-1 rounded"
      />
      <input
        name="performed_by"
        placeholder="Performed by (profile id)"
        class="border px-2 py-1 rounded"
      />
      <button type="submit" class="btn btn-primary">Filter</button>
    </form>
  </div>

  {#if data.logs.length === 0}
    <p>No audit events.</p>
  {:else}
    <table class="w-full table-auto border-collapse">
      <thead>
        <tr class="text-left text-sm text-gray-600">
          <th class="p-2">When</th>
          <th class="p-2">Event</th>
          <th class="p-2">Actor</th>
          <th class="p-2">Profile</th>
          <th class="p-2">By</th>
          <th class="p-2">Details</th>
        </tr>
      </thead>
      <tbody>
        {#each data.logs as l}
          <tr class="border-t">
            <td class="p-2 text-sm"
              >{new Date(l.created_at).toLocaleString()}</td
            >
            <td class="p-2 text-sm">{l.event_type}</td>
            <td class="p-2 text-sm">{l.actor_id}</td>
            <td class="p-2 text-sm">{l.profile_id}</td>
            <td class="p-2 text-sm">{l.performed_by}</td>
            <td class="p-2 text-sm"
              >{l.details ? JSON.stringify(l.details) : ""}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/if}
