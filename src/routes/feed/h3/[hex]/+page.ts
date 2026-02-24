// src/routes/feed/h3/[hex]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
  const { hex } = params;

  // default k-ring expansion
  const k = Number(url.searchParams.get('k') ?? '2');

  if (!hex || typeof hex !== 'string') {
    throw new Error('Invalid H3 hex index');
  }

  if (Number.isNaN(k) || k < 0 || k > 10) {
    throw new Error('Invalid k-ring value');
  }

  return {
    hex,
    k
  };
};