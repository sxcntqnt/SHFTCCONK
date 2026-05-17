import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"

export const prerender = false

export const GET: RequestHandler = async () => {
  return sitemap.response({
    origin: WebsiteBaseUrl,

    // Routes that should NEVER be included in the sitemap
    excludeRoutePatterns: [
      ".*\\(auth\\).*",              // exclude standalone (auth)
      ".*\\(marketing\\)/auth.*",    // exclude marketing auth routes
      "^/verify(/.*)?$",            // /verify and subroutes
      "^/login(/.*)?$",             // /login and subroutes
      "^/login/invite/.*$",         // excludes /login/invite/[token]
    ],
  })
}