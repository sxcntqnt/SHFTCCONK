<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

{#if data.type === 'category'}
	<!-- Category listing: e.g. /help/tracking -->
	<span class="section-tag">{data.category.label}</span>
	<h1 class="page-title">{data.category.label}</h1>
	<p class="page-lead">{data.category.description}</p>

	{#if data.articles.length}
		<div class="faq-list">
			{#each data.articles as article}
				<a href={`/help/${article.category}/${article.slug}`} class="faq-item">
					<span class="faq-item-title">{article.title}</span>
					<p class="faq-item-excerpt">{article.excerpt}</p>
				</a>
			{/each}
		</div>
	{:else}
		<p class="empty-state">No articles in this category yet.</p>
	{/if}

	<a href="/help" class="back-link">← Back to Help Centre</a>
{:else}
	<!-- Individual article: e.g. /help/why-isnt-my-route-showing-vehicles -->
	{#if data.category}
		<a href={`/help/${data.category.id}`} class="section-tag">{data.category.label}</a>
	{/if}

	<h1 class="article-title">{data.article.title}</h1>

	<div class="article-body">
		<svelte:component this={data.article.component} />
	</div>

	<a href="/help" class="back-link">← Back to Help Centre</a>
{/if}

<svelte:head>
	<title>
		{data.type === 'category' ? data.category.label : data.article.title} — Help Centre | Matatu Pulse
	</title>
	<meta
		name="description"
		content={data.type === 'category' ? data.category.description : data.article.excerpt}
	/>
</svelte:head>

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
		text-decoration: none;
	}
	.page-title,
	.article-title {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-1);
		margin-bottom: 12px;
	}
	.article-title {
		margin-bottom: 28px;
	}
	.page-lead {
		font-size: 1rem;
		color: var(--text-2);
		line-height: 1.75;
		margin-bottom: 28px;
		max-width: 640px;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 32px;
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
	.empty-state {
		font-size: 0.9rem;
		color: var(--text-3);
		margin-bottom: 32px;
	}

	.article-body {
		font-size: 0.95rem;
		color: var(--text-2);
		line-height: 1.8;
		max-width: 680px;
	}
	.article-body :global(p) {
		margin-bottom: 18px;
	}
	.article-body :global(a) {
		color: var(--orange);
		text-decoration: none;
	}
	.article-body :global(a:hover) {
		text-decoration: underline;
	}
	.article-body :global(h2) {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--text-1);
		margin: 32px 0 12px;
	}
	.article-body :global(code) {
		font-family: monospace;
		background: var(--surface);
		padding: 2px 6px;
		border-radius: 5px;
		font-size: 0.85em;
		color: var(--orange);
	}

	.back-link {
		display: inline-block;
		margin-top: 8px;
		font-size: 0.85rem;
		color: var(--text-3);
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--orange);
	}
</style>
