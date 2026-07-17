import type { RequestHandler } from "@sveltejs/kit";
import * as sitemap from "super-sitemap";
import { WebsiteBaseUrl } from "../../../config";
import { categories } from "$lib/content/community-categories";
import { flatLinks } from "$lib/docs/docs-nav";
import { helpArticles } from "$lib/content/help/help-articles";
import { helpCategories } from "$lib/content/help/help-categories";

export const prerender = false;

export const GET: RequestHandler = async () => {
  const docSlugs = flatLinks().map(
    (link) => link.href.replace(/^\/docs\//, "")
  );

  const helpSlugs = [
    // Category pages
    ...helpCategories.map((c) => c.id),

    // Article pages
    ...helpArticles.map(
      (a) => `${a.category}/${a.slug}`
    )
  ];

  return sitemap.response({
    origin: WebsiteBaseUrl,

    paramValues: {
      // /community/[category]
      "/community/[category]": categories.map(
        (c) => c.slug
      ),

      // /docs/[...slug]
      "/docs/[...slug]": docSlugs,

      // /help/[...slug]
      "/help/[...slug]": helpSlugs
    },

    excludeRoutePatterns: [
      // auth
      ".*\\(auth\\).*",
      ".*\\(marketing\\)/auth.*",

      // private routes
      "^/verify(/.*)?$",
      "^/login(/.*)?$",

      // tokens
      ".*\\[token\\].*",

      // DO NOT put posts into sitemap
      ".*\\[category\\]/\\[post\\].*",
      "^/login/invite/\\[token\\]$"
    ]
  });
};
