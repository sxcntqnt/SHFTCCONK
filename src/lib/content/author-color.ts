// src/lib/content/author-color.ts
const palette = ['#e06030', '#009b88', '#d95618', '#7c3aed', '#2563eb'];

export function authorColor(author: string): string {
  let hash = 0;
  for (let i = 0; i < author.length; i++) hash = author.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}
