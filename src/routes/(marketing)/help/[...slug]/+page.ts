import { error } from '@sveltejs/kit';
import {
        getArticleBySlug,
        getArticlesByCategory,
        articleCategory
} from '$lib/content/help/help-articles';
import { getCategory } from '$lib/content/help/help-categories';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
        const segments = params.slug
                .split('/')
                .filter(Boolean);

        if (segments.length === 0) {
                throw error(404, 'Missing help slug.');
        }

        // /help/<category>
        if (segments.length === 1) {
                const [categoryId] = segments;

                const category = getCategory(categoryId);

                if (!category) {
                        throw error(404, `Unknown help category: ${categoryId}`);
                }

                return {
                        type: 'category' as const,
                        category,
                        articles: getArticlesByCategory(category.id)
                };
        }

        // /help/<category>/<article>
        if (segments.length === 2) {
                const [categoryId, articleSlug] = segments;

                const category = getCategory(categoryId);

                if (!category) {
                        throw error(404, `Unknown help category: ${categoryId}`);
                }

                const article = getArticleBySlug(articleSlug);

                if (!article) {
                        throw error(404, `Unknown help article: ${articleSlug}`);
                }

                // Prevent mismatched URLs like:
                // /help/tracking/update-payment-details
                if (article.category !== category.id) {
                        throw error(
                                404,
                                `Article "${articleSlug}" does not belong to category "${categoryId}".`
                        );
                }

                return {
                        type: 'article' as const,
                        article,
                        category
                };
        }

        throw error(404, 'Invalid help URL.');
};
