import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"

export const prerender = false

export const GET: RequestHandler = async () => {
  return sitemap.response({
    origin: WebsiteBaseUrl,

    // Routes that should NEVER be included in the sitemap
    excludeRoutePatterns: [
      ".*\\(auth\\).*",                    // exclude all routes inside (auth) group
      ".*\\(marketing\\)/auth.*",          // exclude marketing auth routes
      "^/verify(/.*)?$",                   // /verify and subroutes
      "^/login(/.*)?$",                    // /login and all subroutes
      ".*\\[token\\].*",                   // ← This is the most reliable fix
    ],
  })
}
