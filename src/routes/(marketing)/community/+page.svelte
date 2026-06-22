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
  <title>Community — Matatu Pulse | Nairobi Transit Riders & Operators Forum</title>
  <meta
    name="description"
    content="Join the Matatu Pulse community — a forum for Nairobi commuters, matatu operators, and transit enthusiasts to share route tips, report issues, and shape the future of Nairobi's transit data."
  />
</svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow"><span class="live-dot"></span> Community</div>
      <h1>The Nairobi Transit<br /><em>Community Hub</em></h1>
      <p class="hero-sub">
        Share route tips, report what you're seeing on the ground, ask
        questions, and help build the most accurate picture of Nairobi's matatu
        network — together.
      </p>
      <div class="hero-actions">
        <a href="/community/join" class="btn-primary"
          >Join the Community<svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
          ><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/community/latest" class="btn-ghost">Latest Discussions →</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <div class="stats-band">
    <div class="stats-inner">
      {#each [{ val: "4,200+", lbl: "Members" }, { val: "18,000+", lbl: "Discussions" }, { val: "850+", lbl: "Route Tips" }, { val: "Daily", lbl: "Active Updates" }] as s}
        <div class="stat">
          <div class="stat-val">{s.val}</div>
          <div class="stat-lbl">{s.lbl}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Forum -->
  <section class="section">
    <div class="inner">
      <span class="section-tag">Forum</span>
      <h2 class="section-title">Browse by Category</h2>
      <p style="font-size:1rem;color:var(--text-2);line-height:1.7;max-width:520px;margin-bottom:40px;">
        Sign in to post, vote, and follow threads. Browsing is open to everyone.
      </p>

      <div class="forum-layout">
        <div>
          <div class="categories-list">
            {#each data.categories as c}
              <a href="/community/{c.slug}" class="category-card">
                <div class="cat-icon">{@html c.icon}</div>
                <div class="cat-info">
                  <div class="cat-name">{c.name}</div>
                  <p class="cat-desc">{c.desc}</p>
                </div>
                <div class="cat-meta">
                  <div class="cat-count">{c.count ?? ''}</div>
                  <div class="cat-lbl">Posts</div>
                </div>
              </a>
            {/each}
          </div>

          <!-- Recent discussions -->
          <h3 style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--text-1);margin:48px 0 16px;letter-spacing:-0.02em;">
            Recent Discussions
          </h3>
          <div class="discussions-list">
            {#each data.posts as p}
              <a href="/community/{p.category}/{p.slug}" class="discussion">
                <div class="discussion-avatar" style="background:{authorColor(p.author)};">
                  {p.author.charAt(0)}
                </div>
                <div class="discussion-body">
                  <div class="discussion-title">
                    <span class="discussion-tag tag-{p.tag}">{tagLabels[p.tag]}</span
                    >{p.title}
                  </div>
                  <div class="discussion-meta">{p.author} · {timeAgo(p.date)}</div>
                </div>
                <div class="discussion-replies">
                  <div class="reply-count">{p.replies ?? 0}</div>
                  <div class="reply-lbl">replies</div>
                </div>
              </a>
            {/each}
          </div>
        </div>

        <!-- Sidebar -->
        <div class="forum-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-card-title">Top Contributors</div>
            <div class="members-list">
              {#each [{ name: "John Mwangi", posts: "847 posts", color: "#e06030", init: "JM", badge: "Verified Rider" }, { name: "Grace Achieng", posts: "634 posts", color: "#009b88", init: "GA", badge: "Operator" }, { name: "David Kamau", posts: "521 posts", color: "#7c3aed", init: "DK", badge: null }, { name: "Fatuma Hassan", posts: "412 posts", color: "#d95618", init: "FH", badge: null }, { name: "Peter Njoroge", posts: "388 posts", color: "#2563eb", init: "PN", badge: "Verified Rider" }] as m}
                <div class="member">
                  <div class="member-avatar" style="background:{m.color};">{m.init}</div>
                  <div>
                    <div class="member-name">{m.name}</div>
                    <div class="member-posts">{m.posts}</div>
                  </div>
                  {#if m.badge}<span class="member-badge">{m.badge}</span>{/if}
                </div>
              {/each}
            </div>
          </div>

          <div class="sidebar-card">
            <div class="sidebar-card-title">Community Route Tips</div>
            <div class="tips-list">
              {#each [{ route: "CBD → Westlands", text: "Leave before 7:45am. After that, the Museum Hill traffic makes it twice as slow and fares jump.", author: "John M." }, { route: "CBD → Kasarani", text: "Board at Country Bus on River Road — the vehicles are less crowded and you're guaranteed a seat.", author: "Grace A." }, { route: "CBD → Rongai", text: "Avoid Fridays after 5pm. Take the 4:30pm matatu or prepare for 2+ hours. No exceptions.", author: "Sarah N." }] as t}
                <div class="tip-item">
                  <div class="tip-route">{t.route}</div>
                  <p class="tip-text">{t.text}</p>
                  <div class="tip-author">— {t.author}</div>
                </div>
              {/each}
            </div>
          </div>

          <div class="sidebar-card" style="background:rgba(242,101,34,0.04);border-color:rgba(242,101,34,0.2);">
            <div class="sidebar-card-title" style="color:var(--orange);">Your Input Shapes the App</div>
            <p style="font-size:0.82rem;color:var(--text-2);line-height:1.65;margin-bottom:16px;">
              Route tips shared in the community are reviewed by our data team
              and used to improve ETA accuracy and coverage decisions. Every
              post matters.
            </p>
            <a href="/community/join" style="display:flex;align-items:center;gap:7px;font-size:0.82rem;font-weight:700;color:var(--orange);text-decoration:none;">
              Join and start contributing →
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Guidelines -->
  <section class="section alt">
    <div class="inner">
      <span class="section-tag">Community Standards</span>
      <h2 class="section-title">How We Keep This Useful</h2>
      <p
        style="font-size:1rem;color:var(--text-2);line-height:1.7;max-width:540px;margin-bottom:44px;"
      >
        The Matatu Pulse community works because people share accurate, helpful
        information. Three principles keep it that way.
      </p>
      <div class="guidelines-grid">
        {#each [{ title: "Be Specific", desc: "Route tips and ground reports are most useful when they include the specific route, boarding stage, time of day, and direction. 'Thika Road is slow' helps no one. 'Thika Road northbound past Allsops at 5:30pm is gridlocked' helps everyone.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/></svg>` }, { title: "Keep It Current", desc: "Ground reports are only useful when they're fresh. Tag old reports as 'Resolved' when the situation clears. Our system automatically archives reports older than 6 hours from the live feed — but they remain searchable.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` }, { title: "Be Respectful", desc: "Matatu operators, drivers, and riders are all part of this community. Criticism of specific vehicles or drivers should focus on patterns, not personal attacks. Sacco names are fine; driver names are not.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` }, { title: "Verify Before Posting", desc: "For route reports and incident alerts, post what you've personally observed or can verify from a trusted source. Rumours shared as fact spread fast and erode trust in the community's information.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` }, { title: "Constructive Feature Requests", desc: "Feature requests are most likely to be implemented when they describe the problem you're experiencing, not just the specific solution you imagine. Our product team reads everything.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` }, { title: "No Spam or Self-Promotion", desc: "The community exists to share transit intelligence, not to advertise services. Relevant business links are fine in context; unsolicited promotion is removed. Repeat offenders are banned without warning.", icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>` }] as g}
          <div class="guideline-card">
            <div class="gl-icon">{@html g.icon}</div>
            <div class="gl-title">{g.title}</div>
            <p class="gl-desc">{g.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="final-cta">
    <div class="final-inner">
      <h2>Join 4,200 Riders &<br /><em>Operators Already Inside</em></h2>
      <p>
        Sign in with your Matatu Pulse account to start posting, voting on
        features, and contributing to the most accurate ground-level picture of
        Nairobi's transit network.
      </p>
      <div class="hero-actions" style="justify-content:center;">
        <a href="/community/join" class="btn-primary"
          >Create Your Account<svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg
          ></a
        >
        <a href="/community/latest" class="btn-ghost"
          >Browse Without Signing In →</a
        >
      </div>
    </div>
  </section>
</div>

<style>
  .page {
    background: var(--ink);
  }

  /* ── HERO ── */
  .hero {
    padding: 100px 2rem 88px;
    text-align: center;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--rim);
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 40% 55% at 20% 70%,
        rgba(242, 101, 34, 0.07),
        transparent 60%
      ),
      radial-gradient(
        ellipse 40% 55% at 80% 30%,
        rgba(0, 176, 155, 0.06),
        transparent 60%
      );
    pointer-events: none;
  }
  .hero-inner {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
    background: rgba(0, 176, 155, 0.1);
    border: 1px solid rgba(0, 176, 155, 0.25);
  }
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.4);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(0, 176, 155, 0);
    }
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5.5vw, 3.8rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 20px;
  }
  h1 em {
    font-style: normal;
    color: var(--orange);
  }
  .hero-sub {
    font-size: 1.1rem;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 580px;
    margin: 0 auto 40px;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    background: var(--orange);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(242, 101, 34, 0.3);
    transition:
      background 0.2s,
      transform 0.15s;
  }
  .btn-primary:hover {
    background: #d95618;
    transform: translateY(-2px);
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: transparent;
    border: 1px solid var(--rim-2);
    color: var(--text-2);
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 100px;
    text-decoration: none;
    transition:
      border-color 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .btn-ghost:hover {
    border-color: var(--rim);
    color: var(--text-1);
    transform: translateY(-2px);
  }

  /* ── STATS ── */
  .stats-band {
    background: var(--ink-2);
    border-bottom: 1px solid var(--rim);
    padding: 44px 2rem;
  }
  .stats-inner {
    max-width: 800px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .stat {
    text-align: center;
    padding: 14px;
    border-right: 1px solid var(--rim);
  }
  .stat:last-child {
    border-right: none;
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 5px;
  }
  .stat-lbl {
    font-size: 0.72rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 500;
  }

  .section {
    padding: 88px 2rem;
  }
  .section.alt {
    background: var(--ink-2);
    border-top: 1px solid var(--rim);
    border-bottom: 1px solid var(--rim);
  }
  .inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .section-tag {
    display: inline-block;
    margin-bottom: 14px;
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
  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    line-height: 1.15;
    margin-bottom: 14px;
  }

  /* ── FORUM CATEGORIES ── */
  .forum-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 28px;
    align-items: start;
  }

  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .category-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 14px;
    padding: 20px 22px;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 18px;
    transition:
      border-color 0.3s,
      transform 0.2s;
  }
  .category-card:hover {
    border-color: rgba(242, 101, 34, 0.28);
    transform: translateX(4px);
  }
  .cat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    flex-shrink: 0;
  }
  .cat-info {
    flex: 1;
  }
  .cat-name {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .cat-desc {
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.5;
  }
  .cat-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-end;
    text-align: right;
    flex-shrink: 0;
  }
  .cat-count {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .cat-lbl {
    font-size: 0.68rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── SIDEBAR ── */
  .forum-sidebar {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .sidebar-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 24px;
  }
  .sidebar-card-title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 16px;
  }

  /* Active members */
  .members-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .member {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .member-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }
  .member-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .member-posts {
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .member-badge {
    margin-left: auto;
    padding: 1px 7px;
    border-radius: 100px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(242, 101, 34, 0.1);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.2);
  }

  /* Route tips */
  .tips-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .tip-item {
    padding-bottom: 12px;
    border-bottom: 1px solid var(--rim);
  }
  .tip-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .tip-route {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--orange);
    margin-bottom: 4px;
  }
  .tip-text {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.55;
  }
  .tip-author {
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: 4px;
  }

  /* ── RECENT DISCUSSIONS ── */
  .discussions-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 40px;
  }
  .discussion {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 12px;
    padding: 18px 22px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    text-decoration: none;
    transition: border-color 0.3s;
  }
  .discussion:hover {
    border-color: var(--rim-2);
  }
  .discussion-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }
  .discussion-body {
    flex: 1;
    min-width: 0;
  }
  .discussion-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .discussion-meta {
    font-size: 0.75rem;
    color: var(--text-3);
  }
  .discussion-tag {
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-right: 6px;
  }
  .tag-tip {
    background: rgba(0, 176, 155, 0.1);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.2);
  }
  .tag-question {
    background: rgba(242, 101, 34, 0.1);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.2);
  }
  .tag-report {
    background: rgba(248, 113, 113, 0.1);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.2);
  }
  .tag-announce {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.2);
  }
  .discussion-replies {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }
  .reply-count {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1;
  }
  .reply-lbl {
    font-size: 0.62rem;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── GUIDELINES ── */
  .guidelines-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .guideline-card {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 16px;
    padding: 24px 20px;
  }
  .gl-icon {
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: rgba(242, 101, 34, 0.1);
    border: 1px solid rgba(242, 101, 34, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--orange);
    margin-bottom: 14px;
  }
  .gl-title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1);
    margin-bottom: 7px;
  }
  .gl-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    line-height: 1.65;
  }

  /* ── FINAL CTA ── */
  .final-cta {
    padding: 100px 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .final-cta::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 60% 60% at 50% 0%,
      rgba(242, 101, 34, 0.08),
      transparent 60%
    );
    pointer-events: none;
  }
  .final-inner {
    position: relative;
    max-width: 560px;
    margin: 0 auto;
  }
  .final-inner h2 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--text-1);
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .final-inner h2 em {
    font-style: normal;
    color: var(--orange);
  }
  .final-inner p {
    font-size: 1rem;
    color: var(--text-2);
    line-height: 1.7;
    margin-bottom: 36px;
  }

  @media (max-width: 1024px) {
    .forum-layout {
      grid-template-columns: 1fr;
    }
    .forum-sidebar {
      grid-row: 1;
    }
  }
  @media (max-width: 900px) {
    .stats-inner {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat:nth-child(2) {
      border-right: none;
    }
    .guidelines-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .guidelines-grid {
      grid-template-columns: 1fr;
    }
    .category-card {
      flex-wrap: wrap;
    }
    .section {
      padding: 64px 1.25rem;
    }
    .hero {
      padding: 72px 1.25rem 64px;
    }
  }
</style>
