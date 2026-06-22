<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<svelte:head>
  <title>{data.meta.title} — Matatu Pulse Community</title>
  <meta name="description" content={data.meta.excerpt} />
</svelte:head>

<div class="page">
  <article class="post-wrap">
    <div class="inner">
      <nav class="breadcrumb">
        <a href="/community">Community</a>
        <span>›</span>
        <a href="/community/{data.category.slug}">{data.category.name}</a>
        <span>›</span>
        <span class="current">{data.meta.title}</span>
      </nav>

      <span class="tag tag-{data.meta.tag}">{data.meta.tag}</span>
      <h1>{data.meta.title}</h1>

      <div class="post-meta">
        <span class="author">{data.meta.author}</span>
        <span class="sep">·</span>
        <span class="date">{new Date(data.meta.date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        {#if data.meta.route}
          <span class="sep">·</span>
          <span class="route-badge">{data.meta.route}</span>
        {/if}
      </div>

      <div class="post-body prose">
        <svelte:component this={data.content} />
      </div>

      <div class="post-footer">
        <a href="/community/{data.category.slug}" class="back-link">
          ← Back to {data.category.name}
        </a>
      </div>
    </div>
  </article>
</div>

<style>
  .page { background: var(--ink); min-height: 100vh; }

  .post-wrap { padding: 72px 2rem 100px; }
  .inner { max-width: 720px; margin: 0 auto; }

  .breadcrumb {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.78rem; color: var(--text-3);
    margin-bottom: 32px; flex-wrap: wrap;
  }
  .breadcrumb a {
    color: var(--text-3); text-decoration: none;
    transition: color 0.2s;
  }
  .breadcrumb a:hover { color: var(--orange); }
  .breadcrumb .current { color: var(--text-2); }

  .tag {
    display: inline-block; padding: 3px 10px;
    border-radius: 100px; font-size: 0.65rem;
    font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.07em; margin-bottom: 16px;
  }
  .tag-tip      { background: rgba(0,176,155,0.1);   color: var(--teal);   border: 1px solid rgba(0,176,155,0.2); }
  .tag-report   { background: rgba(248,113,113,0.1); color: #f87171;       border: 1px solid rgba(248,113,113,0.2); }
  .tag-question { background: rgba(242,101,34,0.1);  color: var(--orange); border: 1px solid rgba(242,101,34,0.2); }
  .tag-announce { background: rgba(139,92,246,0.1);  color: #a78bfa;      border: 1px solid rgba(139,92,246,0.2); }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-bottom: 16px;
  }

  .post-meta {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.82rem; color: var(--text-3);
    margin-bottom: 48px; flex-wrap: wrap;
  }
  .author { font-weight: 600; color: var(--text-2); }
  .sep { color: var(--rim-2); }
  .route-badge {
    padding: 2px 10px; border-radius: 100px;
    background: rgba(242,101,34,0.08);
    color: var(--orange);
    border: 1px solid rgba(242,101,34,0.18);
    font-size: 0.72rem; font-weight: 700;
  }

  /* Prose styles for mdsvex rendered markdown */
  .prose {
    font-size: 1rem; color: var(--text-2);
    line-height: 1.8;
  }
  .prose :global(h2) {
    font-family: var(--font-display);
    font-size: 1.3rem; font-weight: 700;
    color: var(--text-1); margin: 40px 0 12px;
    letter-spacing: -0.02em;
  }
  .prose :global(h3) {
    font-family: var(--font-display);
    font-size: 1.05rem; font-weight: 700;
    color: var(--text-1); margin: 32px 0 10px;
  }
  .prose :global(p) { margin-bottom: 20px; }
  .prose :global(ul), .prose :global(ol) {
    margin: 0 0 20px 20px; padding: 0;
  }
  .prose :global(li) { margin-bottom: 6px; }
  .prose :global(strong) { color: var(--text-1); font-weight: 700; }
  .prose :global(a) { color: var(--orange); text-decoration: underline; }
  .prose :global(code) {
    font-size: 0.85em; padding: 2px 6px;
    background: var(--surface); border: 1px solid var(--rim);
    border-radius: 4px; color: var(--teal);
  }
  .prose :global(blockquote) {
    border-left: 3px solid var(--orange);
    padding-left: 16px; margin: 24px 0;
    color: var(--text-3); font-style: italic;
  }
  .prose :global(hr) {
    border: none; border-top: 1px solid var(--rim);
    margin: 40px 0;
  }

  .post-footer { margin-top: 64px; padding-top: 32px; border-top: 1px solid var(--rim); }
  .back-link {
    font-size: 0.85rem; font-weight: 600;
    color: var(--text-3); text-decoration: none;
    transition: color 0.2s;
  }
  .back-link:hover { color: var(--orange); }
</style>
