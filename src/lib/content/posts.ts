export interface PostMeta {
  title: string;
  category: string;
  tag: 'tip' | 'report' | 'question' | 'announce';
  author: string;
  date: string;
  excerpt: string;
  route?: string;
  replies?: number;
}

export interface Post extends PostMeta {
  slug: string;
}

const modules = import.meta.glob<{ metadata: PostMeta }>(
  '/src/lib/content/community/*/*.md',
  { eager: true }
);

export function getAllPosts(): Post[] {
  return Object.entries(modules)
    .map(([path, mod]) => ({
      slug: path.split('/').pop()!.replace('.md', ''),
      ...mod.metadata
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostsByCategory(slug: string): Post[] {
  return getAllPosts().filter((p) => p.category === slug);
}

// Returns each category slug mapped to its post count
export function getPostCountsByCategory(): Record<string, number> {
  return getAllPosts().reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
}
