import { sentrySvelteKit } from "@sentry/sveltekit"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import { buildAndCacheSearchIndex } from "./src/lib/build_index"
// Native .node addons — must never be bundled by esbuild/rollup.
// Listed exhaustively so both dev (ssr.external) and build
// (rollupOptions.external) skip them consistently.
const nativeAddons = [
  '@duckdb/node-api',
  '@duckdb/node-bindings',
  '@duckdb/node-bindings-linux-x64',
  '@duckdb/node-bindings-linux-arm64',
  '@duckdb/node-bindings-darwin-x64',
  '@duckdb/node-bindings-darwin-arm64',
  '@duckdb/node-bindings-win32-x64',
  '@duckdb/node-bindings-win32-arm64'
]
export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: "web3clubs",
      project: "javascript-sveltekit",
    }),
    sveltekit(),
    {
      name: "vite-build-search-index",
      apply: "build",
      async buildEnd() {
        console.log("Building search index...")
        await buildAndCacheSearchIndex()
      },
    },
  ],
  define: {
    __SVELTEKIT_DEBUG__: true,
  },
  server: {
    host: true,
    allowedHosts: [
      "sxcntcnqunts.org",
      "chat.sxcntcnqunts.org",
      "maps.sxcntcnqunts.org",
      "hypnotiz.sxcntcnqunts.org",
      "games.sxcntcnqunts.org",
      "sentry.io",
      "eu.posthog.com",
    ],
    fs: {
      allow: [".."],
    },
  },
  preview: {
    host: true,
    allowedHosts: ["sxcntcnqunts.org"],
  },
  optimizeDeps: {
    exclude: [
      "layerchart",
      "@duckdb/node-api",
      "@duckdb/node-bindings",
    ],
  },
  esbuild: {
    target: "es2022",
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    rolldownOptions: {
      external: nativeAddons,
      output: {
        splitting: true,
      },
    },
  },
  ssr: {
    noExternal: [
      "three",
      "firebase/app",
      "firebase/database",
      "firebase/auth",
      "layerchart",
    ],
    external: nativeAddons,
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
  },
})
