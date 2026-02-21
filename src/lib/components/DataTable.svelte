<script lang="ts">
  export let columns: string[] = [];
  export let rows: any[] = [];
  export let rowKey: (row: any) => string = (row, i) => i.toString();
</script>

<div class="overflow-x-auto bg-white rounded-3xl shadow-lg">
  <table class="w-full text-left">
    <thead class="bg-gray-50">
      <tr>
        {#each columns as col}
          <th class="px-4 py-2 font-medium text-gray-700">{col}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, i (rowKey(row, i))}
        <tr class="border-b hover:bg-gray-50">
          {#each columns as col}
            <td class="px-4 py-2">{row[col]}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>