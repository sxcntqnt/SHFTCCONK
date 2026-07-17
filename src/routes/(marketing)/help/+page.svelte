<script lang="ts">
        import { helpCategories } from '$lib/content/help/help-categories';
        import { getArticlesByCategory } from '$lib/content/help/help-articles';
        import IconGlyph from '$lib/components/IconGlyph.svelte';
</script>

<svelte:head>
        <title>Help Centre — Matatu Pulse | Support for Riders & Operators</title>
        <meta
                name="description"
                content="Find answers to common questions about Matatu Pulse — tracking, arrival alerts, route coverage, account settings, operator dashboards, and technical issues."
        />
</svelte:head>

<span class="section-tag">Help Centre</span>
<h1 class="page-title">Frequently Asked Questions</h1>
<p class="page-lead">
        Browse common questions from riders and operators below, or use the sidebar to jump to a
        specific topic.
</p>

<div class="status-banner">
        <div class="status-dot"></div>
        <p class="status-text">
                All systems operational —
                <strong>API, live tracking, and alerts running normally</strong>
        </p>
        <a href="/docs/status" class="status-link">View Status Page →</a>
</div>

<!-- Category quick-links: driven entirely by help-categories.ts -->
<div class="quickstart-grid">
        {#each helpCategories as cat}
                <a href={`/help/${cat.id}`} class="qs-card">
                        <div class="qs-icon">
                                <IconGlyph key={cat.icon} />
                        </div>

                        <div class="qs-title">{cat.label}</div>

                        <p class="qs-desc">{cat.description}</p>
                </a>
        {/each}
</div>

<!-- One section per category, populated from whatever articles exist -->
{#each helpCategories as cat}
        {@const articles = getArticlesByCategory(cat.id)}

        {#if articles.length}
                <div class="faq-section">
                        <div class="faq-section-head">
                                <h2>{cat.label}</h2>

                                <a href={`/help/${cat.id}`} class="faq-section-link">
                                        View all →
                                </a>
                        </div>

                        <div class="faq-list">
                                {#each articles.slice(0, 4) as article}
                                        <a
                                                href={`/help/${article.category}/${article.slug}`}
                                                class="faq-item"
                                        >
                                                <span class="faq-item-title">
                                                        {article.title}
                                                </span>

                                                <p class="faq-item-excerpt">
                                                        {article.excerpt}
                                                </p>
                                        </a>
                                {/each}
                        </div>
                </div>
        {/if}
{/each}

<div class="faq-section">
        <h2>Still Need Help?</h2>

        <div class="contact-list">
                <a href="mailto:support@matatupulse.co.ke" class="contact-row">
                        <span class="contact-tag">Email</span>
                        <span class="contact-title">support@matatupulse.co.ke</span>
                        <span class="contact-desc">Typically within 4 hours</span>
                </a>

                <a href="/community" class="contact-row">
                        <span class="contact-tag">Forum</span>
                        <span class="contact-title">Community Forum</span>
                        <span class="contact-desc">Community response in minutes</span>
                </a>

                <a href="tel:+254700000000" class="contact-row">
                        <span class="contact-tag">Phone</span>
                        <span class="contact-title">+254 700 000 000</span>
                        <span class="contact-desc">Operators, 6am–10pm EAT</span>
                </a>
        </div>
</div>

<style>
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
	.page-title {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-1);
		margin-bottom: 12px;
	}
	.page-lead {
		font-size: 1rem;
		color: var(--text-2);
		line-height: 1.75;
		margin-bottom: 28px;
		max-width: 640px;
	}

	.status-banner {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		background: rgba(0, 176, 155, 0.07);
		border: 1px solid rgba(0, 176, 155, 0.2);
		border-radius: 12px;
		margin-bottom: 36px;
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--teal);
		box-shadow: 0 0 8px rgba(0, 176, 155, 0.6);
		flex-shrink: 0;
	}
	.status-text {
		font-size: 0.85rem;
		color: var(--text-2);
	}
	.status-text strong {
		color: var(--teal);
	}
	.status-link {
		margin-left: auto;
		font-size: 0.78rem;
		color: var(--text-3);
		text-decoration: none;
		white-space: nowrap;
	}
	.status-link:hover {
		color: var(--teal);
	}

	.quickstart-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		margin-bottom: 56px;
	}
	.qs-card {
		background: var(--surface);
		border: 1px solid var(--rim);
		border-radius: 16px;
		padding: 24px 22px;
		text-decoration: none;
		display: block;
		transition: border-color 0.3s, transform 0.2s;
	}
	.qs-card:hover {
		border-color: rgba(242, 101, 34, 0.3);
		transform: translateY(-2px);
	}
	.qs-icon {
		width: 40px;
		height: 40px;
		border-radius: 11px;
		background: rgba(242, 101, 34, 0.1);
		border: 1px solid rgba(242, 101, 34, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--orange);
		margin-bottom: 16px;
	}
	.qs-title {
		font-family: var(--font-display);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-1);
		margin-bottom: 6px;
	}
	.qs-desc {
		font-size: 0.8rem;
		color: var(--text-2);
		line-height: 1.6;
	}

	.faq-section {
		margin-bottom: 48px;
	}
	.faq-section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.faq-section h2 {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-1);
	}
	.faq-section-link {
		font-size: 0.8rem;
		color: var(--orange);
		text-decoration: none;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.faq-item {
		display: block;
		background: var(--surface);
		border: 1px solid var(--rim);
		border-radius: 12px;
		padding: 16px 20px;
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.faq-item:hover {
		border-color: rgba(242, 101, 34, 0.3);
	}
	.faq-item-title {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-1);
		margin-bottom: 4px;
	}
	.faq-item-excerpt {
		font-size: 0.82rem;
		color: var(--text-2);
		line-height: 1.6;
	}

	.contact-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.contact-row {
		display: flex;
		align-items: baseline;
		gap: 16px;
		padding: 14px 16px;
		border-radius: 12px;
		text-decoration: none;
		transition: background 0.15s;
	}
	.contact-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.contact-tag {
		font-family: monospace;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--orange);
		min-width: 56px;
	}
	.contact-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-1);
	}
	.contact-desc {
		font-size: 0.78rem;
		color: var(--text-3);
		margin-left: auto;
	}
</style>
