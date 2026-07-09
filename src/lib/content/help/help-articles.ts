// Loads every markdown file under src/lib/content/help/<category>/*.md
// via mdsvex. Category comes from the folder name, not frontmatter —
// that's the single source of truth for which category an article
// belongs to, and it can't drift out of sync the way a hand-typed
// `category:` field could. Content authors add a .md file to the
// right subfolder; nothing here or in the routes needs to change.

import { getCategory, type HelpCategory } from './help-categories';

export interface HelpArticleMeta {
	slug: string;
	title: string;
	category: string;
	excerpt: string;
}

export interface HelpArticle extends HelpArticleMeta {
	component: ConstructorOfATypedSvelteComponent;
}

const modules = import.meta.glob('/src/lib/content/help/*/*.md', { eager: true }) as Record<
	string,
	{ metadata: Omit<HelpArticleMeta, 'slug' | 'category'>; default: ConstructorOfATypedSvelteComponent }
>;

export const helpArticles: HelpArticle[] = Object.entries(modules)
	.map(([path, mod]) => {
		// path looks like /src/lib/content/help/operators/gps-unit-damaged-or-stolen.md
		const segments = path.split('/');
		const filename = segments.pop()!;
		const category = segments.pop()!;
		const slug = filename.replace('.md', '').toLowerCase();

		return {
			slug,
			category,
			...mod.metadata,
			component: mod.default
		};
	})
	.sort((a, b) => a.title.localeCompare(b.title));

export function getArticlesByCategory(categoryId: string): HelpArticle[] {
	return helpArticles.filter((a) => a.category === categoryId);
}

export function getArticleBySlug(slug: string): HelpArticle | undefined {
	return helpArticles.find((a) => a.slug === slug);
}

export function articleCategory(article: HelpArticleMeta): HelpCategory | undefined {
	return getCategory(article.category);
}
