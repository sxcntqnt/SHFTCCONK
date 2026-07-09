<script lang="ts">
	import { page } from '$app/stores';
	import { helpGroups, categoriesByGroup } from '$lib/content/help/help-categories';
	import { getArticlesByCategory } from '$lib/content/help/help-articles';

	$: currentPath = $page.url.pathname;
</script>

<div class="page">
	<!-- Hero: static shell, shared across every /help route -->
	<section class="hero">
		<div class="hero-inner">
			<div class="eyebrow">Help Centre</div>
			<h1>How Can We<br /><em>Help You?</em></h1>
			<p class="hero-sub">
				Answers for riders, operators, and developers. Search below or browse by category.
			</p>
			<div class="search-wrap">
				<span class="search-icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
				</span>
				<input
					class="search-input"
					type="search"
					placeholder="Search help articles — e.g. 'arrival alert', 'GPS tracking'"
				/>
			</div>
		</div>
	</section>

	<div class="docs-layout">
		<nav class="docs-sidebar">
			{#each helpGroups as group}
				<div class="sidebar-section">
					<span class="sidebar-section-label">{group.label}</span>

					{#if group.id === 'support'}
						<a href="/community" class="sidebar-link">Community Forum</a>
						<a href="/docs/status" class="sidebar-link">API Status</a>
						<a href="mailto:support@matatupulse.co.ke" class="sidebar-link">Email Support</a>
					{:else}
						{#each categoriesByGroup(group.id) as cat}
							<a
								href={`/help/${cat.id}`}
								class="sidebar-link {currentPath === `/help/${cat.id}` ? 'active' : ''}"
							>
								{cat.label}
								<span class="sidebar-count">{getArticlesByCategory(cat.id).length}</span>
							</a>
						{/each}
					{/if}
				</div>
			{/each}
		</nav>

		<main class="docs-main">
			<slot />
		</main>
	</div>
</div>

<style>
	.page {
		background: var(--ink);
	}

	/* ── HERO ── */
	.hero {
		padding: 88px 2rem 72px;
		text-align: center;
		position: relative;
		overflow: hidden;
		border-bottom: 1px solid var(--rim);
	}
	.hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 55% 65% at 50% -5%, rgba(242, 101, 34, 0.1), transparent 60%);
		pointer-events: none;
	}
	.hero-inner {
		position: relative;
		max-width: 640px;
		margin: 0 auto;
	}
	.eyebrow {
		display: inline-block;
		margin-bottom: 22px;
		padding: 5px 14px;
		border-radius: 100px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--orange);
		background: rgba(242, 101, 34, 0.1);
		border: 1px solid rgba(242, 101, 34, 0.22);
	}
	h1 {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.2rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text-1);
		line-height: 1.1;
		margin-bottom: 18px;
	}
	h1 em {
		font-style: normal;
		color: var(--orange);
	}
	.hero-sub {
		font-size: 1.05rem;
		color: var(--text-2);
		line-height: 1.7;
		max-width: 500px;
		margin: 0 auto 32px;
	}
	.search-wrap {
		max-width: 480px;
		margin: 0 auto;
		position: relative;
	}
	.search-icon {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-3);
	}
	.search-input {
		width: 100%;
		padding: 13px 16px 13px 44px;
		background: var(--surface);
		border: 1px solid var(--rim-2);
		border-radius: 14px;
		font-size: 0.9rem;
		color: var(--text-1);
		font-family: var(--font-body);
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.search-input:focus {
		border-color: rgba(242, 101, 34, 0.45);
		box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.08);
	}
	.search-input::placeholder {
		color: var(--text-3);
	}

	/* ── LAYOUT ── */
	.docs-layout {
		display: grid;
		grid-template-columns: 240px 1fr;
		max-width: 1200px;
		margin: 0 auto;
		min-height: 70vh;
		border-left: 1px solid var(--rim);
		border-right: 1px solid var(--rim);
	}

	/* ── SIDEBAR ── */
	.docs-sidebar {
		border-right: 1px solid var(--rim);
		padding: 36px 0;
		position: sticky;
		top: 0;
		height: calc(100vh - 54px);
		overflow-y: auto;
		scrollbar-width: none;
	}
	.docs-sidebar::-webkit-scrollbar {
		display: none;
	}
	.sidebar-section {
		margin-bottom: 28px;
	}
	.sidebar-section-label {
		padding: 0 20px 8px;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-3);
		display: block;
	}
	.sidebar-link {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 20px;
		font-size: 0.845rem;
		color: var(--text-2);
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: color 0.15s, border-color 0.15s, background 0.15s;
	}
	.sidebar-link:hover {
		color: var(--text-1);
		background: rgba(255, 255, 255, 0.02);
	}
	.sidebar-link.active {
		color: var(--orange);
		border-left-color: var(--orange);
		background: rgba(242, 101, 34, 0.05);
	}
	.sidebar-count {
		margin-left: auto;
		font-size: 0.7rem;
		color: var(--text-3);
	}

	/* ── MAIN ── */
	.docs-main {
		padding: 48px 56px;
	}

	@media (max-width: 900px) {
		.docs-layout {
			grid-template-columns: 1fr;
		}
		.docs-sidebar {
			display: none;
		}
		.docs-main {
			padding: 36px 24px;
		}
	}
	@media (max-width: 600px) {
		.hero {
			padding: 64px 1.25rem 56px;
		}
		.docs-main {
			padding: 28px 16px;
		}
	}
</style>
