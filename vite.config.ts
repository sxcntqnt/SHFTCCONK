import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"
import { buildAndCacheSearchIndex } from "./src/lib/build_index"

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: "vite-build-search-index",
      writeBundle: {
        order: "post",
        sequential: false,
        handler: async () => {
          console.log("Building search index...")
          await buildAndCacheSearchIndex()
        },
      },
    },
  ],

  // 🔐 allow external hostname access
  server: {
    host: true, // listen on 0.0.0.0 (required for remote access)
    allowedHosts: [
      "sxcntcnqunts.com"
    ],
  },

  preview: {
    host: true,
    allowedHosts: [
      "sxcntcnqunts.com"
    ],
  },

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
  },
})

