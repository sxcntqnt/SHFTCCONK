import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: [".svelte", ".md"],

	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: [".md"]
		})
	],

	kit: {
		adapter: adapter(),

		// allow up to 150kb of style to be inlined with the HTML
		inlineStyleThreshold: 150000,

		// Required for PostHog session replay to work correctly with SSR
		paths: {
			relative: false
		},

		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				console.error("PRERENDER ERROR");
				console.error({
					path,
					referrer,
					message
				});
			}
		},

		experimental: {
			tracing: {
				server: true
			},

			instrumentation: {
				server: true
			}
		}
	}
};

export default config;
