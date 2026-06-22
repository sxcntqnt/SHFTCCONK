import { error } from '@sveltejs/kit';
import { categories } from '$lib/content/community-categories';
import { getPostsByCategory } from '$lib/content/posts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  const category = categories.find((c) => c.slug === params.category);
  if (!category) throw error(404, 'Category not found');

  const posts = getPostsByCategory(params.category);
  return { category, posts };
};
