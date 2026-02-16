<script lang="ts">
  // Notifications scaffold
  let title = ''
  let body = ''
  let notifications: any[] = []
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Notifications</h1>
  <form method="post" action="/notifications/create" class="max-w-md space-y-3">
    <input name="title" placeholder="Title" class="w-full border rounded px-3 py-2" />
    <textarea name="body" placeholder="Message body" class="w-full border rounded px-3 py-2"></textarea>
    <button class="btn btn-primary">Create Notification</button>
  </form>

  <div class="mt-6 text-gray-500">List of notifications will appear here.</div>
</div>
