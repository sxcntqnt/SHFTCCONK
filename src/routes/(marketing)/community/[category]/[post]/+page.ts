import { error } from '@sveltejs/kit';
import { categories } from '$lib/content/community-categories';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const category = categories.find((c) => c.slug === params.category);
  if (!category) throw error(404, 'Category not found');

  try {
    const post = await import(
      `../../../../../lib/content/community/${params.category}/${params.post}.md`
    );
    return {
      content: post.default,
      meta: post.metadata,
      category,
      slug: params.post
    };
  } catch {
    throw error(404, 'Post not found');
  }
};
