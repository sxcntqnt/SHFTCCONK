import { sentrySvelteKit } from "@sentry/sveltekit"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"
import { buildAndCacheSearchIndex } from "./src/lib/build_index"

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: "web3clubs",
      project: "javascript-sveltekit",
    }),
    sveltekit(),
    {
      name: "vite-build-search-index",
      apply: "build", // only run during build
      async buildEnd() {
        // correct hook
        console.log("Building search index...")
        await buildAndCacheSearchIndex()
      },
    },
  ],

  define: {
    __SVELTEKIT_DEBUG__: true,
  },

  server: {
    host: true, // listen on all network interfaces
    allowedHosts: ["sxcntcnqunts.org", "chat.sxcntcnqunts.com", "sentry.io", "eu.posthog.com"],
    fs: {
      allow: [".."], // allow accessing files outside project root
    },
  },

  preview: {
    host: true,
    allowedHosts: ["sxcntcnqunts.org"],
  },
  optimizeDeps: {
    exclude: ["layerchart"],
  },
  ssr: {
    noExternal: [
      "three",
      "firebase/app",
      "firebase/database",
      "firebase/auth",
      "layerchart",
    ],
  },
  build: {
    rollupOptions: {
            external: [
        '@duckdb/node-bindings-linux-x64',
        '@duckdb/node-bindings-linux-arm64',
        '@duckdb/node-bindings-darwin-x64',
        '@duckdb/node-bindings-darwin-arm64',
        '@duckdb/node-bindings-win32-x64',
        '@duckdb/node-bindings-win32-arm64'

              // snappy
      '@napi-rs/snappy-linux-x64-gnu',
      '@napi-rs/snappy-linux-arm64-gnu',
      '@napi-rs/snappy-darwin-x64',
      '@napi-rs/snappy-darwin-arm64',
      '@napi-rs/snappy-win32-x64-msvc',
      '@napi-rs/snappy-win32-arm64-msvc'
      ],
      output: {
        manualChunks: {
          three: ["three", "@threlte/core", "@threlte/extras"],
          charts: ["layerchart"],
        },
      },
    },
  },

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
  },
})
