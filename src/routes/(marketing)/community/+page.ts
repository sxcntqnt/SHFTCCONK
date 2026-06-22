import { categories } from '$lib/content/community-categories';
import { getAllPosts, getPostCountsByCategory } from '$lib/content/posts';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
  const counts = getPostCountsByCategory();
  const categoriesWithCounts = categories.map((c) => ({
    ...c,
    count: counts[c.slug] ?? 0
  }));

  return {
    categories: categoriesWithCounts,
    posts: getAllPosts().slice(0, 5)
  };
};
