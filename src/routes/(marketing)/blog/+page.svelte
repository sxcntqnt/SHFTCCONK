<script lang="ts">
  import { sortedBlogPosts, blogInfo } from "./posts"

  /* Derive reading time estimate from description length as a proxy */
  function readingTime(desc: string = ""): string {
    const words = desc.split(" ").length
    const mins = Math.max(1, Math.round((words * 6) / 200))
    return `${mins} min read`
  }

  /* First post is the featured hero post */
  const [featuredPost, ...restPosts] = sortedBlogPosts
</script>

<style>
  /* ── inherits CSS vars from layout ── */

  .blog-root {
    background: var(--ink);
    min-height: 100vh;
  }

  /* ── PAGE HEADER ── */
  .blog-header {
    padding: 96px 2rem 80px;
    text-align: center;
    border-bottom: 1px solid var(--rim);
    position: relative; overflow: hidden;
  }
  .blog-header::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 70% at 50% -10%, rgba(242,101,34,0.12), transparent 65%);
    pointer-events: none;
  }
  .blog-header-inner { position: relative; max-width: 680px; margin: 0 auto; }

  .blog-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 14px; margin-bottom: 24px;
    background: rgba(242,101,34,0.1);
    border: 1px solid rgba(242,101,34,0.22);
    border-radius: 100px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--orange);
  }

  .blog-title {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    font-weight: 800; letter-spacing: -0.04em;
    color: var(--text-1); line-height: 1.1; margin-bottom: 16px;
  }
  .blog-title em { font-style: normal; color: var(--orange); }

  .blog-subtitle {
    font-size: 1rem; color: var(--text-2); line-height: 1.7;
    margin-bottom: 28px;
  }

  .rss-link {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 16px;
    background: var(--rim); border: 1px solid var(--rim-2);
    border-radius: 100px;
    font-size: 0.78rem; font-weight: 600; color: var(--text-3);
    text-decoration: none; transition: color 0.2s, border-color 0.2s;
  }
  .rss-link:hover { color: var(--orange); border-color: rgba(242,101,34,0.3); }
  .rss-link img { width: 14px; height: 14px; opacity: 0.6; }

  /* ── MAIN LAYOUT ── */
  .blog-body {
    max-width: 1200px; margin: 0 auto;
    padding: 72px 2rem 100px;
  }

  /* ── FEATURED POST ── */
  .featured-post {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0;
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 24px; overflow: hidden;
    margin-bottom: 72px;
    text-decoration: none;
    transition: border-color 0.3s, transform 0.3s;
  }
  .featured-post:hover { border-color: rgba(242,101,34,0.35); transform: translateY(-4px); }

  .featured-accent {
    background: linear-gradient(160deg, rgba(242,101,34,0.7) 0%, rgba(217,86,24,0.4) 60%, rgba(10,10,12,0) 100%),
                var(--ink-3);
    min-height: 340px;
    position: relative; overflow: hidden;
    display: flex; align-items: flex-end; padding: 36px;
  }
  .featured-accent::after {
    content: '';
    position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  .featured-badge {
    position: relative; z-index: 1;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 100px;
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #fff;
  }
  .featured-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); }

  .featured-content {
    padding: 44px 40px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .post-date {
    font-size: 0.78rem; font-weight: 500; color: var(--text-3);
    letter-spacing: 0.05em; margin-bottom: 14px;
  }
  .featured-content h2 {
    font-family: var(--font-display);
    font-size: 1.55rem; font-weight: 800;
    letter-spacing: -0.03em; color: var(--text-1);
    line-height: 1.25; margin-bottom: 14px;
  }
  .featured-content p {
    font-size: 0.925rem; color: var(--text-2);
    line-height: 1.7; margin-bottom: 28px;
  }
  .read-more {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 0.875rem; font-weight: 600; color: var(--orange);
    transition: gap 0.2s;
  }
  .featured-post:hover .read-more { gap: 12px; }

  /* ── SECTION LABEL ── */
  .posts-section-label {
    font-family: var(--font-display);
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text-3);
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--rim);
  }

  /* ── POST GRID ── */
  .posts-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .post-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 18px; overflow: hidden;
    text-decoration: none;
    display: flex; flex-direction: column;
    transition: border-color 0.3s, transform 0.3s;
  }
  .post-card:hover { border-color: rgba(242,101,34,0.28); transform: translateY(-3px); }

  .post-card-accent {
    height: 5px;
    background: linear-gradient(90deg, var(--orange), rgba(242,101,34,0.2));
    opacity: 0;
    transition: opacity 0.3s;
  }
  .post-card:hover .post-card-accent { opacity: 1; }

  .post-card-body {
    padding: 28px 26px 28px;
    display: flex; flex-direction: column; flex: 1;
  }
  .post-card-date {
    font-size: 0.74rem; font-weight: 500; color: var(--text-3);
    letter-spacing: 0.06em; margin-bottom: 12px;
  }
  .post-card-title {
    font-family: var(--font-display);
    font-size: 1.05rem; font-weight: 700;
    letter-spacing: -0.02em; color: var(--text-1);
    line-height: 1.35; margin-bottom: 10px;
  }
  .post-card-desc {
    font-size: 0.85rem; color: var(--text-2);
    line-height: 1.65; flex: 1; margin-bottom: 22px;
  }
  .post-card-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid var(--rim);
  }
  .reading-time {
    font-size: 0.72rem; color: var(--text-3); font-weight: 500;
    letter-spacing: 0.04em;
  }
  .arrow-icon {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--rim); border: 1px solid var(--rim-2);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-3);
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .post-card:hover .arrow-icon {
    background: rgba(242,101,34,0.12);
    border-color: rgba(242,101,34,0.3);
    color: var(--orange);
  }

  /* ── EMPTY STATE ── */
  .empty-state {
    grid-column: span 3; text-align: center;
    padding: 80px 20px; color: var(--text-3);
  }
  .empty-state p { font-size: 0.95rem; line-height: 1.7; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .featured-post { grid-template-columns: 1fr; }
    .featured-accent { min-height: 180px; }
    .posts-grid { grid-template-columns: repeat(2, 1fr); }
    .empty-state { grid-column: span 2; }
  }
  @media (max-width: 640px) {
    .posts-grid { grid-template-columns: 1fr; }
    .featured-content { padding: 28px 24px; }
    .empty-state { grid-column: span 1; }
    .blog-body { padding: 48px 1.25rem 80px; }
  }
</style>

<svelte:head>
  <title>{blogInfo.name}</title>
  <meta name="description" content="Insights, updates, and stories from the team building smarter matatu transit in Nairobi." />
</svelte:head>

<div class="blog-root">

  <!-- ═══ HEADER ═══ -->
  <header class="blog-header">
    <div class="blog-header-inner">
      <div class="blog-eyebrow">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6"/>
        </svg>
        Journal
      </div>
      <h1 class="blog-title">{blogInfo.name.split(" ")[0]} <em>{blogInfo.name.split(" ").slice(1).join(" ") || "Blog"}</em></h1>
      <p class="blog-subtitle">
        Insights, product updates, and stories from the team building smarter matatu transit in Nairobi.
      </p>
      <a href="/blog/rss.xml" target="_blank" rel="noreferrer" class="rss-link">
        <img src="/images/rss.svg" alt="RSS" />
        Subscribe via RSS
      </a>
    </div>
  </header>

  <!-- ═══ BODY ═══ -->
  <div class="blog-body">

    <!-- Featured post -->
    {#if featuredPost}
      <a href={featuredPost.link} class="featured-post">
        <div class="featured-accent">
          <span class="featured-badge">
            <span class="featured-dot"></span>
            Latest Post
          </span>
        </div>
        <div class="featured-content">
          <div class="post-date">
            {featuredPost.parsedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            &nbsp;·&nbsp; {readingTime(featuredPost.description)}
          </div>
          <h2>{featuredPost.title}</h2>
          <p>{featuredPost.description}</p>
          <span class="read-more">
            Read article
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </a>
    {/if}

    <!-- Rest of posts -->
    {#if restPosts.length > 0}
      <p class="posts-section-label">All Articles</p>
      <div class="posts-grid">
        {#each restPosts as post}
          <a href={post.link} class="post-card">
            <div class="post-card-accent"></div>
            <div class="post-card-body">
              <div class="post-card-date">
                {post.parsedDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div class="post-card-title">{post.title}</div>
              <p class="post-card-desc">{post.description}</p>
              <div class="post-card-footer">
                <span class="reading-time">{readingTime(post.description)}</span>
                <span class="arrow-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {:else if !featuredPost}
      <div class="posts-grid">
        <div class="empty-state">
          <p>No posts yet. Check back soon — we're working on something worth reading.</p>
        </div>
      </div>
    {/if}

  </div>
</div>