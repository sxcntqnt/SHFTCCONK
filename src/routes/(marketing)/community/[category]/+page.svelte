<script lang="ts">
  import { authorColor } from '$lib/content/author-color';
  import type { PageData } from './$types';

  export let data: PageData;

  const tagLabels: Record<string, string> = {
    tip: 'Tip',
    report: 'Report',
    question: 'Question',
    announce: 'Announce'
  };

  function timeAgo(date: string): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }
</script>

<svelte:head>
  <title>{data.category.name} — Matatu Pulse Community</title>
  <meta name="description" content={data.category.desc} />
</svelte:head>

<div class="page">
  <section class="cat-hero">
    <div class="inner">
      <a href="/community" class="back">← Community</a>
      <div class="cat-icon">{@html data.category.icon}</div>
      <h1>{data.category.name}</h1>
      <p class="cat-desc">{data.category.desc}</p>
      <div class="cat-meta-row">
        <span class="meta-pill">{data.posts.length} posts</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="inner">
      {#if data.posts.length === 0}
        <div class="empty">
          <p>No posts yet in this category.</p>
          <a href="/community/join" class="btn-primary">Be the first to post →</a>
        </div>
      {:else}
        <div class="posts-list">
          {#each data.posts as p}
            <a href="/community/{p.category}/{p.slug}" class="post-row">
              <div class="post-avatar" style="background:{authorColor(p.author)};">
                {p.author.charAt(0)}
              </div>
              <div class="post-body">
                <div class="post-title">
                  <span class="tag tag-{p.tag}">{tagLabels[p.tag]}</span>
                  {p.title}
                </div>
                <p class="post-excerpt">{p.excerpt}</p>
                <div class="post-meta">{p.author} · {timeAgo(p.date)}</div>
              </div>
              <div class="post-replies">
                <div class="reply-count">{p.replies ?? 0}</div>
                <div class="reply-lbl">replies</div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  .page { background: var(--ink); min-height: 100vh; }

  .cat-hero {
    padding: 72px 2rem 56px;
    border-bottom: 1px solid var(--rim);
  }
  .inner { max-width: 860px; margin: 0 auto; }

  .back {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    margin-bottom: 28px;
    transition: color 0.2s;
  }
  .back:hover { color: var(--text-1); }

  .cat-icon {
    width: 48px; height: 48px;
    border-radius: 14px;
    background: rgba(242,101,34,0.1);
    border: 1px solid rgba(242,101,34,0.2);
    display: flex; align-items: center; justify-content: center;
    color: var(--orange);
    margin-bottom: 20px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 10px;
  }

  .cat-desc {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 560px;
    margin-bottom: 20px;
  }

  .cat-meta-row { display: flex; gap: 10px; }
  .meta-pill {
    padding: 3px 12px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(242,101,34,0.08);
    color: var(--orange);
    border: 1px solid rgba(242,101,34,0.18);
  }

  .section { padding: 48px 2rem 88px; }

  .posts-list { display: flex; flex-direction: column; gap: 2px; }

  .post-row {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 12px;
    padding: 20px 22px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.15s;
  }
  .post-row:hover {
    border-color: rgba(242,101,34,0.28);
    transform: translateX(3px);
  }

  .post-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 0.72rem; font-weight: 800;
    color: #fff; flex-shrink: 0;
  }

  .post-body { flex: 1; min-width: 0; }

  .post-title {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .post-excerpt {
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.5;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .post-meta { font-size: 0.72rem; color: var(--text-3); }

  .tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-right: 6px;
  }
  .tag-tip    { background: rgba(0,176,155,0.1);   color: var(--teal);   border: 1px solid rgba(0,176,155,0.2); }
  .tag-report { background: rgba(248,113,113,0.1); color: #f87171;       border: 1px solid rgba(248,113,113,0.2); }
  .tag-question { background: rgba(242,101,34,0.1); color: var(--orange); border: 1px solid rgba(242,101,34,0.2); }
  .tag-announce { background: rgba(139,92,246,0.1); color: #a78bfa;      border: 1px solid rgba(139,92,246,0.2); }

  .post-replies {
    display: flex; flex-direction: column;
    align-items: center; flex-shrink: 0;
  }
  .reply-count {
    font-family: var(--font-display);
    font-size: 1rem; font-weight: 700;
    color: var(--text-1); line-height: 1;
  }
  .reply-lbl {
    font-size: 0.6rem; color: var(--text-3);
    text-transform: uppercase; letter-spacing: 0.06em;
  }

  .empty {
    text-align: center; padding: 64px 0;
    color: var(--text-2); font-size: 1rem;
  }
  .empty p { margin-bottom: 20px; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px; background: var(--orange); color: #fff;
    font-weight: 700; font-size: 0.88rem; border-radius: 100px;
    text-decoration: none;
  }
</style>
