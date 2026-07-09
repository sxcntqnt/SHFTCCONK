import { error } from '@sveltejs/kit';
import { getArticleBySlug, getArticlesByCategory, articleCategory } from '$lib/content/help/help-articles';
import { getCategory } from '$lib/content/help/help-categories';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;

	// Guards against the exact bug you hit: a route match with no slug
	// segment at all (misnamed folder, or a link built with an undefined value).
	if (!slug) {
		throw error(404, 'Missing help slug — check the link that got you here.');
	}

	// /help/:slug is shared between category listings and individual
	// articles. Categories win the lookup since their ids are a small,
	// known set defined in help-categories.ts.
	const category = getCategory(slug);
	if (category) {
		return {
			type: 'category' as const,
			category,
			articles: getArticlesByCategory(category.id)
		};
	}

	const article = getArticleBySlug(slug);
	if (article) {
		return {
			type: 'article' as const,
			article,
			category: articleCategory(article)
		};
	}

	throw error(404, `Nothing found at /help/${slug}`);
};
