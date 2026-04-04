<script lang="ts">
  import { page } from "$app/state"
  import { error } from "@sveltejs/kit"
  import { sortedBlogPosts, type BlogPost } from "./../posts"
  import { WebsiteName } from "../../../../config"

  interface Props {
    children?: import("svelte").Snippet
  }
  let { children }: Props = $props()

  function getCurrentPost(url: string): BlogPost {
    let found: BlogPost | null = null
    for (const post of sortedBlogPosts) {
      if (url === post.link || url === post.link + "/") {
        found = post
        break
      }
    }
    if (!found) error(404, "Blog post not found")
    return found
  }

  let currentPost = $derived(getCurrentPost(page.url.pathname))

  function buildLdJson(post: BlogPost) {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      author: { "@type": "Organization", name: post.author ?? WebsiteName },
      publisher: { "@type": "Organization", name: WebsiteName },
      datePublished: post.parsedDate?.toISOString(),
      dateModified: post.parsedDate?.toISOString(),
    }
  }

  let jsonldScript = $derived(
    `<script type="application/ld+json">${JSON.stringify(buildLdJson(currentPost)) + "<"}/script>`,
  )
  let pageUrl = $derived(page.url.origin + page.url.pathname)

  /* Estimated reading time — using description as a seed length proxy;
     real word count comes from the rendered slot but we can't access it here */
  function readingTime(desc: string = ""): string {
    const approxWords = desc.split(" ").length * 8 // desc ≈ 1/8th of full post
    return `${Math.max(3, Math.round(approxWords / 200))} min read`
  }

  /* Share helpers */
  function twitterShare(title: string, url: string) {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  }
  function linkedinShare(url: string) {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  }
</script>

<svelte:head>
  <title>{currentPost.title} — {WebsiteName}</title>
  <meta name="description" content={currentPost.description} />
  <meta property="og:title" content={currentPost.title} />
  <meta property="og:description" content={currentPost.description} />
  <meta property="og:site_name" content={WebsiteName} />
  <meta property="og:url" content={pageUrl} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={currentPost.title} />
  <meta name="twitter:description" content={currentPost.description} />
  {@html jsonldScript}
</svelte:head>

<div class="post-root">
  <!-- ═══ HERO ═══ -->
  <header class="post-hero">
    <div class="post-hero-inner">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="/blog">Blog</a>
        <span class="breadcrumb-sep">›</span>
        <span>{currentPost.category ?? "Article"}</span>
      </nav>

      <!-- Category -->
      {#if currentPost.category}
        <div class="post-category">{currentPost.category}</div>
      {/if}

      <!-- Title -->
      <h1 class="post-title">{currentPost.title}</h1>

      <!-- Standfirst -->
      <p class="post-standfirst">{currentPost.description}</p>

      <!-- Meta -->
      <div class="post-meta">
        <div class="meta-author">
          <div class="meta-avatar">
            {(currentPost.author ?? WebsiteName).charAt(0)}
          </div>
          <div class="meta-name">{currentPost.author ?? WebsiteName}</div>
        </div>
        <div class="meta-divider"></div>
        <span class="meta-detail">
          {currentPost.parsedDate?.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <div class="meta-divider"></div>
        <span class="meta-detail">{readingTime(currentPost.description)}</span>
      </div>
    </div>
  </header>

  <!-- ═══ CONTENT + SIDEBAR ═══ -->
  <div class="post-layout">
    <!-- Prose -->
    <div class="post-prose">
      {@render children?.()}
    </div>

    <!-- Sidebar -->
    <aside class="post-sidebar">
      <!-- Back -->
      <a href="/blog" class="back-link">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        All Posts
      </a>

      <!-- Share -->
      <div class="sidebar-card">
        <p class="sidebar-label">Share</p>
        <div class="share-btns">
          <a
            href={twitterShare(currentPost.title, pageUrl)}
            target="_blank"
            rel="noreferrer"
            class="share-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>
            Share on X
          </a>
          <a
            href={linkedinShare(pageUrl)}
            target="_blank"
            rel="noreferrer"
            class="share-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"
              />
              <circle cx="4" cy="4" r="2" />
            </svg>
            Share on LinkedIn
          </a>
          <button
            class="share-btn"
            onclick={() => navigator.clipboard.writeText(pageUrl)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" /><path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
              />
            </svg>
            Copy Link
          </button>
        </div>
      </div>

      <!-- Related posts — same category -->
      {#if sortedBlogPosts.filter((p) => p.category === currentPost.category && p.link !== currentPost.link).length > 0}
        <div class="sidebar-card">
          <p class="sidebar-label">More in {currentPost.category}</p>
          {#each sortedBlogPosts
            .filter((p) => p.category === currentPost.category && p.link !== currentPost.link)
            .slice(0, 4) as related}
            <a href={related.link} class="related-post">
              <div class="related-post-title">{related.title}</div>
              <div class="related-post-date">
                {related.parsedDate?.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </aside>
  </div>
</div>

<style>
  /* ── inherits CSS vars from layout ── */

  .post-root {
    background: var(--ink);
    min-height: 100vh;
  }

  /* ── HERO BANNER ── */
  .post-hero {
    padding: 80px 2rem 72px;
    border-bottom: 1px solid var(--rim);
    position: relative;
    overflow: hidden;
  }
  .post-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 55% 80% at 50% -5%,
      rgba(242, 101, 34, 0.11),
      transparent 60%
    );
    pointer-events: none;
  }
  .post-hero-inner {
    position: relative;
    max-width: 760px;
    margin: 0 auto;
  }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 28px;
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .breadcrumb a {
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .breadcrumb a:hover {
    color: var(--orange);
  }
  .breadcrumb-sep {
    opacity: 0.4;
  }

  /* Category pill */
  .post-category {
    display: inline-block;
    margin-bottom: 20px;
    padding: 4px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.22);
  }

  /* Title */
  .post-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4.5vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.12;
    margin-bottom: 20px;
  }

  /* Description / standfirst */
  .post-standfirst {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--text-2);
    margin-bottom: 32px;
    max-width: 640px;
  }

  /* Meta row */
  .post-meta {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .meta-author {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .meta-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--orange), #d95618);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.78rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .meta-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .meta-divider {
    width: 1px;
    height: 16px;
    background: var(--rim-2);
  }
  .meta-detail {
    font-size: 0.8rem;
    color: var(--text-3);
  }

  /* ── CONTENT AREA ── */
  .post-layout {
    max-width: 1100px;
    margin: 0 auto;
    padding: 72px 2rem 100px;
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 72px;
    align-items: start;
  }

  /* Prose */
  .post-prose {
    min-width: 0;
    color: var(--text-2);
    font-size: 1.05rem;
    line-height: 1.85;
  }

  /* Override prose elements */
  .post-prose :global(h1),
  .post-prose :global(h2),
  .post-prose :global(h3),
  .post-prose :global(h4) {
    font-family: var(--font-display);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.2;
    margin-top: 2.2em;
    margin-bottom: 0.7em;
  }
  .post-prose :global(h2) {
    font-size: 1.5rem;
  }
  .post-prose :global(h3) {
    font-size: 1.2rem;
  }

  .post-prose :global(p) {
    margin-bottom: 1.5em;
    color: var(--text-2);
  }

  .post-prose :global(a) {
    color: var(--orange);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(242, 101, 34, 0.35);
    transition: text-decoration-color 0.2s;
  }
  .post-prose :global(a:hover) {
    text-decoration-color: var(--orange);
  }

  .post-prose :global(blockquote) {
    border-left: 3px solid var(--orange);
    padding: 4px 0 4px 24px;
    margin: 2em 0;
    color: var(--text-1);
    font-size: 1.1rem;
    font-style: italic;
  }

  .post-prose :global(code) {
    background: var(--surface);
    border: 1px solid var(--rim-2);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.88em;
    color: var(--orange);
  }

  .post-prose :global(pre) {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 24px;
    overflow-x: auto;
    margin: 2em 0;
  }
  .post-prose :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    color: var(--text-1);
    font-size: 0.9rem;
  }

  .post-prose :global(ul),
  .post-prose :global(ol) {
    padding-left: 1.4em;
    margin-bottom: 1.5em;
  }
  .post-prose :global(li) {
    margin-bottom: 0.5em;
    color: var(--text-2);
  }

  .post-prose :global(hr) {
    border: none;
    border-top: 1px solid var(--rim);
    margin: 3em 0;
  }

  .post-prose :global(img) {
    border-radius: 16px;
    border: 1px solid var(--rim);
    width: 100%;
    margin: 2em 0;
  }

  .post-prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 2em 0;
    font-size: 0.9rem;
  }
  .post-prose :global(th) {
    background: var(--surface);
    color: var(--text-1);
    font-weight: 700;
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--rim-2);
    font-family: var(--font-display);
    font-size: 0.78rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .post-prose :global(td) {
    padding: 12px 16px;
    color: var(--text-2);
    border-bottom: 1px solid var(--rim);
  }

  /* ── SIDEBAR ── */
  .post-sidebar {
    position: sticky;
    top: 88px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .sidebar-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 22px 20px;
  }
  .sidebar-label {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 16px;
  }

  /* Share buttons */
  .share-btns {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .share-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--text-2);
    background: var(--ink-2);
    border: 1px solid var(--rim);
    transition:
      color 0.2s,
      border-color 0.2s,
      background 0.2s;
  }
  .share-btn:hover {
    color: var(--text-1);
    border-color: var(--rim-2);
    background: var(--rim);
  }
  .share-btn svg {
    flex-shrink: 0;
  }

  /* Back link */
  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--text-2);
    background: var(--ink-2);
    border: 1px solid var(--rim);
    transition:
      color 0.2s,
      border-color 0.2s;
  }
  .back-link:hover {
    color: var(--orange);
    border-color: rgba(242, 101, 34, 0.3);
  }

  /* Related posts */
  .related-post {
    display: block;
    padding: 12px 0;
    text-decoration: none;
    border-bottom: 1px solid var(--rim);
    transition: color 0.2s;
  }
  .related-post:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .related-post-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    line-height: 1.4;
    margin-bottom: 4px;
    transition: color 0.2s;
  }
  .related-post:hover .related-post-title {
    color: var(--orange);
  }
  .related-post-date {
    font-size: 0.72rem;
    color: var(--text-3);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .post-layout {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .post-sidebar {
      position: static;
      flex-direction: row;
      flex-wrap: wrap;
    }
    .sidebar-card {
      flex: 1 1 240px;
    }
  }
  @media (max-width: 600px) {
    .post-hero {
      padding: 56px 1.25rem 52px;
    }
    .post-layout {
      padding: 48px 1.25rem 80px;
    }
    .post-title {
      font-size: 1.8rem;
    }
    .post-sidebar {
      flex-direction: column;
    }
  }
</style>
