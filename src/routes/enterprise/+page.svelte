<script lang="ts">
  // Enterprise / organizations scaffold
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Enterprise / Organizations</h1>
  <form method="post" action="/enterprise/create" class="max-w-md space-y-3">
    <input name="name" placeholder="Organization name" class="w-full border rounded px-3 py-2" />
    <textarea name="description" placeholder="Description" class="w-full border rounded px-3 py-2"></textarea>
    <button class="btn btn-primary">Create Organization</button>
  </form>
</div>
