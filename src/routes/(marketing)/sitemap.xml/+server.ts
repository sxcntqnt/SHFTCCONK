import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"
import { categories } from "$lib/content/community-categories"
import { flatLinks } from "$lib/docs/docs-nav"

export const prerender = false

export const GET: RequestHandler = async () => {

  const docSlugs = flatLinks().map(
    (link) => link.href.replace(/^\/docs\//, "")
  )

  return sitemap.response({

    origin: WebsiteBaseUrl,

    paramValues: {

      // /community/[category]
      "/community/[category]": categories.map(
        (c) => c.slug
      ),

      // /docs/[...slug]
      "/docs/[...slug]": docSlugs

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
      "^/login/invite/\\[token\\]$",
    ]

  })
}
