import { error } from '@sveltejs/kit';
import { findLink } from '$lib/docs/docs-nav';

const docs = import.meta.glob(
  '$lib/content/docs/**/*.md'
);

export async function load({ params }) {
  const slug = params.slug;
  const href = `/docs/${slug}`;

  const navLink = findLink(href);

  if (!navLink) {
    throw error(404, 'Documentation page not found');
  }

  const path = `/src/lib/content/docs/${slug}.md`;

  const loader = docs[path];

  if (!loader) {
    throw error(404, 'Documentation page not found');
  }

  const doc = await loader();

  return {
    content: doc.default,
    meta: doc.metadata,
    navLink
  };
}
