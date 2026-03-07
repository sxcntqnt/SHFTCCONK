<script lang="ts">
  let { label }: { label: string } = $props()
</script>

<div class="popup">{label}</div>

<style>
  .popup {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    color: #111;
    white-space: nowrap;
    pointer-events: none;
    font-weight: 500;
  }
</style>
