<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<svelte:head>
  <title>{data.meta.title} — Matatu Pulse Docs</title>
  <meta name="description" content={data.meta.description} />
</svelte:head>

<div class="doc-page">
  <span class="section-tag">{data.meta.section ?? 'Reference'}</span>
  <h1>{data.meta.title}</h1>
  {#if data.meta.badge}
    <span class="badge badge-{data.meta.badge}">{data.meta.badge}</span>
  {/if}
  <p class="doc-intro">{data.meta.description}</p>

  <div class="prose">
    <svelte:component this={data.content} />
  </div>
</div>

<style>
  .doc-page { max-width: 720px; }

  .section-tag {
    display: inline-block;
    margin-bottom: 12px;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.08);
    border: 1px solid rgba(242, 101, 34, 0.18);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    margin-bottom: 10px;
    line-height: 1.15;
  }

  .badge {
    display: inline-block;
    margin-bottom: 16px;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .badge-new {
    background: rgba(0,176,155,0.15); color: var(--teal);
    border: 1px solid rgba(0,176,155,0.25);
  }
  .badge-beta {
    background: rgba(242,101,34,0.1); color: var(--orange);
    border: 1px solid rgba(242,101,34,0.2);
  }

  .doc-intro {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.75;
    margin-bottom: 40px;
    max-width: 600px;
  }

  /* Prose */
  .prose { font-size: 0.92rem; color: var(--text-2); line-height: 1.8; }
  .prose :global(h2) {
    font-family: var(--font-display); font-size: 1.3rem; font-weight: 800;
    color: var(--text-1); margin: 48px 0 12px; letter-spacing: -0.025em;
    padding-top: 48px; border-top: 1px solid var(--rim);
  }
  .prose :global(h3) {
    font-family: var(--font-display); font-size: 1rem; font-weight: 700;
    color: var(--text-1); margin: 28px 0 8px;
  }
  .prose :global(p) { margin-bottom: 18px; }
  .prose :global(ul), .prose :global(ol) { margin: 0 0 18px 20px; }
  .prose :global(li) { margin-bottom: 6px; }
  .prose :global(strong) { color: var(--text-1); font-weight: 700; }
  .prose :global(a) { color: var(--orange); text-decoration: underline; }
  .prose :global(code) {
    font-size: 0.82em; padding: 2px 6px;
    background: #0d0d0f; border: 1px solid var(--rim);
    border-radius: 4px; color: var(--teal);
    font-family: "JetBrains Mono", monospace;
  }
  .prose :global(pre) {
    background: #0d0d0f; border: 1px solid var(--rim);
    border-radius: 12px; padding: 20px 24px;
    overflow-x: auto; margin-bottom: 24px;
    font-size: 0.82rem; line-height: 1.7;
    font-family: "JetBrains Mono", monospace; color: #c9d1d9;
  }
  .prose :global(pre code) {
    background: none; border: none; padding: 0;
    font-size: inherit; color: inherit;
  }
  .prose :global(table) { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .prose :global(th) {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-3);
    padding: 10px 14px; text-align: left;
    border-bottom: 1px solid var(--rim-2); background: var(--surface);
  }
  .prose :global(td) {
    padding: 12px 14px; font-size: 0.845rem;
    color: var(--text-2); border-bottom: 1px solid var(--rim);
  }
  .prose :global(blockquote) {
    border-left: 3px solid var(--orange); padding-left: 16px;
    margin: 24px 0; color: var(--text-3); font-style: italic;
  }
  .prose :global(hr) {
    border: none; border-top: 1px solid var(--rim); margin: 40px 0;
  }
</style>
