// scripts/patch-build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'build/index.js';
let content = readFileSync(path, 'utf8');

const original = `const { path, host, port, server } = await import('./start.js');`;

const patched = `let path, host, port, server;
await Promise.resolve().then(async () => {
  ({ path, host, port, server } = await import('./start.js'));
});`;

if (content.includes(original)) {
  content = content.replace(original, patched);
  writeFileSync(path, content, 'utf8');
  console.log('[patch-build] Patched build/index.js to work around Node TLA bug');
} else {
  console.warn('[patch-build] Expected pattern not found in build/index.js — adapter output may have changed, skipping patch');
}
