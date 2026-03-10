<script lang="ts">
  import {
    Newspaper,
    Pin,
    MapPin,
    Clock,
    Users,
    AlertTriangle,
    ChevronLeft,
    Bell,
    Route,
    Truck,
    Shield,
    Megaphone,
    Info,
    CreditCard,
    ArrowUpRight,
  } from "@lucide/svelte"

  type NewsItem = {
    id: string
    title: string
    body: string
    category: string
    severity: string
    pinned: boolean
    route_ids: string[]
    author_id: string | null
    created_at: string
    profiles?: { full_name: string | null; avatar_url: string | null }
  }

  type Data = {
    org: any
    news: NewsItem[]
    routeMap: Record<string, any>
    categoryCounts: Record<string, number>
    memberCount: number
    currentCategory: string | null
    slug: string
  }

  let { data }: { data: Data } = $props()

  let expandedId: string | null = $state(null)

  const categoryMeta: Record<
    string,
    { label: string; color: string; iconName: string }
  > = {
    general: { label: "General", color: "#60a5fa", iconName: "info" },
    route_change: {
      label: "Route Changes",
      color: "#34d399",
      iconName: "route",
    },
    fare_update: { label: "Fare Updates", color: "#fbbf24", iconName: "fare" },
    service_alert: {
      label: "Service Alerts",
      color: "#f87171",
      iconName: "alert",
    },
    compliance: { label: "Compliance", color: "#a78bfa", iconName: "shield" },
    fleet: { label: "Fleet", color: "#2dd4bf", iconName: "truck" },
    announcement: {
      label: "Announcements",
      color: "#f472b6",
      iconName: "megaphone",
    },
  }

  function catLabel(cat: string): string {
    return (
      categoryMeta[cat]?.label ||
      cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
  }

  function catColor(cat: string): string {
    return categoryMeta[cat]?.color || "#8b8fa3"
  }

  function sevLabel(sev: string): string {
    return sev.charAt(0).toUpperCase() + sev.slice(1)
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  function formatFullDate(dateStr: string): string {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function routeName(rid: string): string {
    const r = data.routeMap[rid]
    if (!r) return rid.slice(0, 8) + "…"
    return r.stage_name
  }

  function initials(name: string | null): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Group news by date for the feed
  function dateGroup(dateStr: string): string {
    if (!dateStr) return "Unknown"
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return "This Week"
    if (days < 30) return "This Month"
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  }

  let groupedNews = $derived(() => {
    const groups: { label: string; items: NewsItem[] }[] = []
    const seen = new Set<string>()

    // Pinned items first as their own group
    const pinned = data.news.filter((n) => n.pinned)
    if (pinned.length > 0) {
      groups.push({ label: "Pinned", items: pinned })
    }

    // Then group the rest by date
    for (const item of data.news.filter((n) => !n.pinned)) {
      const group = dateGroup(item.created_at)
      if (!seen.has(group)) {
        seen.add(group)
        groups.push({ label: group, items: [] })
      }
      groups.find((g) => g.label === group)!.items.push(item)
    }

    return groups
  })
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="nf-root">
  <div class="nf-bg">
    <div class="nf-bg-wash"></div>
  </div>

  <div class="nf-container">
    <!-- Top bar -->
    <nav class="nf-nav">
      <a href="/app/subscribe/{data.slug}" class="nf-back">
        <ChevronLeft size={16} strokeWidth={2} />
        <span>Back</span>
      </a>
      <div class="nf-nav-org">
        <span class="nf-nav-orgname">{data.org.name}</span>
        <span class="nf-nav-count"
          >{data.news.length} update{data.news.length !== 1 ? "s" : ""}</span
        >
      </div>
    </nav>

    <!-- Hero -->
    <header class="nf-hero">
      <h1 class="nf-hero-title">
        <span class="nf-hero-line-1">News &</span>
        <span class="nf-hero-line-2">Updates</span>
      </h1>
      <p class="nf-hero-desc">
        The latest from {data.org.name} — route changes, service alerts, fare updates,
        and everything that keeps your commute informed.
      </p>
    </header>

    <!-- Category navigation -->
    <div class="nf-categories">
      <a
        href="/app/subscribe/{data.slug}/news"
        class="nf-cat-link"
        class:nf-cat-active={!data.currentCategory}
      >
        All
        <span class="nf-cat-num">{data.news.length}</span>
      </a>
      {#each Object.entries(data.categoryCounts) as [cat, count]}
        <a
          href="/app/subscribe/{data.slug}/news?category={cat}"
          class="nf-cat-link"
          class:nf-cat-active={data.currentCategory === cat}
          style="--cat-color: {catColor(cat)}"
        >
          <span class="nf-cat-dot" style="background: {catColor(cat)}"></span>
          {catLabel(cat)}
          <span class="nf-cat-num">{count}</span>
        </a>
      {/each}
    </div>

    <!-- Feed -->
    {#if data.news.length === 0}
      <div class="nf-empty">
        <Newspaper size={40} strokeWidth={1.5} />
        <h2>No updates yet</h2>
        <p>
          When {data.org.name} publishes news, it'll appear here. Stay subscribed
          to be the first to know.
        </p>
      </div>
    {:else}
      <div class="nf-feed">
        {#each groupedNews() as group, gi}
          <!-- Group header -->
          <div class="nf-group-header" style="animation-delay: {gi * 50}ms">
            {#if group.label === "Pinned"}
              <Pin size={13} strokeWidth={2.5} />
            {/if}
            <span>{group.label}</span>
          </div>

          {#each group.items as item, i}
            {@const isExpanded = expandedId === item.id}
            <article
              class="nf-article"
              class:nf-article-pinned={item.pinned}
              class:nf-article-critical={item.severity === "critical"}
              class:nf-article-expanded={isExpanded}
              style="animation-delay: {gi * 50 + (i + 1) * 40}ms"
            >
              <!-- Article header -->
              <div class="nf-article-top">
                <div class="nf-article-meta">
                  <span
                    class="nf-article-cat"
                    style="color: {catColor(
                      item.category,
                    )}; background: {catColor(item.category)}12"
                  >
                    {catLabel(item.category)}
                  </span>
                  {#if item.severity !== "info"}
                    <span class="nf-article-sev nf-sev-{item.severity}"
                      >{sevLabel(item.severity)}</span
                    >
                  {/if}
                </div>
                <time class="nf-article-time"
                  >{formatDate(item.created_at)}</time
                >
              </div>

              <!-- Title -->
              <button
                class="nf-article-title-btn"
                onclick={() => (expandedId = isExpanded ? null : item.id)}
              >
                <h2 class="nf-article-title">{item.title}</h2>
                <ArrowUpRight
                  size={16}
                  strokeWidth={2}
                  class="nf-expand-icon"
                />
              </button>

              <!-- Body preview / expanded -->
              {#if isExpanded}
                <div class="nf-article-body-full nf-slide-in">
                  {#each item.body.split("\n") as paragraph}
                    {#if paragraph.trim()}
                      <p>{paragraph}</p>
                    {/if}
                  {/each}

                  <!-- Route links -->
                  {#if item.route_ids && item.route_ids.length > 0}
                    <div class="nf-article-routes">
                      <span class="nf-routes-label">Affected routes:</span>
                      {#each item.route_ids as rid}
                        <span class="nf-route-chip">
                          <MapPin size={11} strokeWidth={2} />
                          {routeName(rid)}
                        </span>
                      {/each}
                    </div>
                  {/if}

                  <!-- Author + full date -->
                  <div class="nf-article-footer">
                    {#if item.profiles?.full_name}
                      <div class="nf-author">
                        {#if item.profiles.avatar_url}
                          <img
                            src={item.profiles.avatar_url}
                            alt=""
                            class="nf-author-avatar"
                          />
                        {:else}
                          <span class="nf-author-initials"
                            >{initials(item.profiles.full_name)}</span
                          >
                        {/if}
                        <span class="nf-author-name"
                          >{item.profiles.full_name}</span
                        >
                      </div>
                    {/if}
                    <time class="nf-article-fulldate"
                      >{formatFullDate(item.created_at)}</time
                    >
                  </div>
                </div>
              {:else}
                <p class="nf-article-preview">
                  {item.body.length > 160
                    ? item.body.slice(0, 160) + "…"
                    : item.body}
                </p>
              {/if}
            </article>
          {/each}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
  }

  .nf-root {
    --ink: #f0f1f4;
    --ink2: #c8cbd3;
    --ink3: #6b7084;
    --ink4: #44475a;
    --surface: #0a0b0f;
    --raised: rgba(255, 255, 255, 0.02);
    --border: rgba(255, 255, 255, 0.05);

    position: relative;
    min-height: 100vh;
    background: var(--surface);
    color: #e2e4e9;
    overflow: hidden;
  }

  .nf-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .nf-bg-wash {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 350px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.015) 0%,
      transparent 100%
    );
  }

  .nf-container {
    position: relative;
    z-index: 1;
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 4rem;
  }

  /* ── Nav ── */
  .nf-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2.5rem;
    animation: nf-fade 0.4s ease-out both;
  }
  @keyframes nf-fade {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .nf-back {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--ink4);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .nf-back:hover {
    color: var(--ink2);
  }
  .nf-nav-org {
    text-align: right;
  }
  .nf-nav-orgname {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink2);
  }
  .nf-nav-count {
    font-size: 0.72rem;
    color: var(--ink4);
  }

  /* ── Hero ── */
  .nf-hero {
    margin-bottom: 2rem;
    animation: nf-fade 0.5s ease-out both;
    animation-delay: 50ms;
  }
  .nf-hero-title {
    font-family: "Newsreader", Georgia, serif;
    font-size: 2.8rem;
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.03em;
    margin: 0 0 0.85rem;
  }
  .nf-hero-line-1 {
    display: block;
    color: var(--ink);
  }
  .nf-hero-line-2 {
    display: block;
    color: var(--ink4);
    font-style: italic;
  }
  .nf-hero-desc {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--ink3);
    margin: 0;
    max-width: 480px;
  }

  /* ── Categories ── */
  .nf-categories {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--border);
    animation: nf-fade 0.5s ease-out both;
    animation-delay: 100ms;
  }
  .nf-cat-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--ink3);
    background: none;
    border: 1px solid transparent;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .nf-cat-link:hover {
    color: var(--ink2);
    background: var(--raised);
    border-color: var(--border);
  }
  .nf-cat-active {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .nf-cat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .nf-cat-num {
    font-size: 0.65rem;
    color: var(--ink4);
    font-family: "JetBrains Mono", monospace;
  }

  /* ── Empty ── */
  .nf-empty {
    text-align: center;
    padding: 5rem 2rem;
    color: var(--ink4);
  }
  .nf-empty h2 {
    font-family: "Newsreader", Georgia, serif;
    font-size: 1.3rem;
    color: var(--ink2);
    margin: 1rem 0 0.3rem;
    font-weight: 400;
  }
  .nf-empty p {
    font-size: 0.88rem;
    margin: 0;
    max-width: 340px;
    display: inline-block;
    line-height: 1.6;
  }

  /* ── Feed ── */
  .nf-feed {
    display: flex;
    flex-direction: column;
  }

  .nf-group-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink4);
    padding: 1rem 0 0.6rem;
    animation: nf-fade 0.4s ease-out both;
  }

  /* ── Article ── */
  .nf-article {
    padding: 1.25rem 0;
    border-bottom: 1px solid var(--border);
    animation: nf-fade 0.4s ease-out both;
    transition: background 0.2s ease;
  }
  .nf-article:last-child {
    border-bottom: none;
  }
  .nf-article-pinned {
    border-left: 2px solid #a78bfa;
    padding-left: 1rem;
    margin-left: -1rem;
  }
  .nf-article-critical {
    border-left: 2px solid #f87171;
    padding-left: 1rem;
    margin-left: -1rem;
  }

  .nf-article-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }
  .nf-article-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .nf-article-cat {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .nf-article-sev {
    font-size: 0.65rem;
    font-weight: 500;
    padding: 0.12rem 0.35rem;
    border-radius: 4px;
  }
  .nf-sev-notice {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
  }
  .nf-sev-warning {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.08);
  }
  .nf-sev-critical {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }
  .nf-article-time {
    font-size: 0.72rem;
    color: var(--ink4);
    font-family: "JetBrains Mono", monospace;
    flex-shrink: 0;
  }

  .nf-article-title-btn {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    padding: 0;
    margin-bottom: 0.4rem;
  }
  .nf-article-title {
    font-family: "Newsreader", Georgia, serif;
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0;
    line-height: 1.35;
    transition: color 0.15s ease;
  }
  .nf-article-title-btn:hover .nf-article-title {
    color: #fff;
  }
  :global(.nf-expand-icon) {
    flex-shrink: 0;
    color: var(--ink4);
    margin-top: 0.2rem;
    transition:
      transform 0.2s ease,
      color 0.15s ease;
  }
  .nf-article-expanded :global(.nf-expand-icon) {
    transform: rotate(45deg);
    color: var(--ink2);
  }

  .nf-article-preview {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--ink3);
    margin: 0;
  }

  .nf-article-body-full {
    margin-top: 0.25rem;
  }
  .nf-article-body-full p {
    font-family: "Newsreader", Georgia, serif;
    font-size: 1rem;
    line-height: 1.75;
    color: var(--ink2);
    margin: 0 0 0.85rem;
  }

  .nf-article-routes {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin: 0.75rem 0;
  }
  .nf-routes-label {
    font-size: 0.72rem;
    color: var(--ink4);
    font-weight: 500;
  }
  .nf-route-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    color: #34d399;
    background: rgba(52, 211, 153, 0.06);
    padding: 0.2rem 0.5rem;
    border-radius: 5px;
  }

  .nf-article-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    margin-top: 0.5rem;
  }
  .nf-author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .nf-author-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border);
  }
  .nf-author-initials {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--ink3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
  }
  .nf-author-name {
    font-size: 0.78rem;
    color: var(--ink3);
    font-weight: 500;
  }
  .nf-article-fulldate {
    font-size: 0.7rem;
    color: var(--ink4);
    font-family: "JetBrains Mono", monospace;
  }

  .nf-slide-in {
    animation: nf-slide 0.3s ease-out;
  }
  @keyframes nf-slide {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 520px) {
    .nf-container {
      padding: 1rem 0.85rem 3rem;
    }
    .nf-hero-title {
      font-size: 2.2rem;
    }
    .nf-article-pinned,
    .nf-article-critical {
      margin-left: 0;
      padding-left: 0.75rem;
    }
  }
</style>
