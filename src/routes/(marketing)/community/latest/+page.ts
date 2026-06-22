import { getAllPosts } from '$lib/content/posts';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
  return { posts: getAllPosts() };
};
