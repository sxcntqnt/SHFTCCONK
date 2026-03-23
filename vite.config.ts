import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { buildAndCacheSearchIndex } from "./src/lib/build_index";

export default defineConfig({
  plugins: [sentrySvelteKit({
    org: "web3clubs",
    project: "javascript-sveltekit"
  }), sveltekit(), {
    name: "vite-build-search-index",
    apply: "build", // only run during build
    async buildEnd() { // correct hook
      console.log("Building search index...");
      await buildAndCacheSearchIndex();
    },
  }],

  define: {
    __SVELTEKIT_DEBUG__: true,
  },

  server: {
    host: true, // listen on all network interfaces
    allowedHosts: ["sxcntcnqunts.com","chat.sxcntcnqunts.com", "sentry.io"],
    fs: {
      allow: [".."], // allow accessing files outside project root
    },
  },

  preview: {
    host: true,
    allowedHosts: ["sxcntcnqunts.com"],
  },
   optimizeDeps: {
    exclude: ["layerchart"],         
  },
ssr: {
  noExternal: ["three" ,'firebase/app', 'firebase/database', 'firebase/auth',"layerchart"]
},
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'three':    ['three', '@threlte/core', '@threlte/extras'],
        'firebase': ['firebase/app', 'firebase/database', 'firebase/auth'],
        'supabase': ['@supabase/supabase-js', '@supabase/ssr'],
        'maps':     ['maplibre-gl', 'maplibre-gl-draw'],
        'charts':   ['chart.js', 'layerchart'],
      }
    }
  }
},

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
  },
});