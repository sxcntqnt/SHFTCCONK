import type { RequestHandler } from "@sveltejs/kit"
import * as sitemap from "super-sitemap"
import { WebsiteBaseUrl } from "../../../config"

export const prerender = false

export const GET: RequestHandler = async () => {
  return sitemap.response({
    origin: WebsiteBaseUrl,
    excludeRoutePatterns: [
      ".*\\(auth\\).*", // exclude standalone (auth)
      ".*\\(marketing\\)/auth.*", // exclude (marketing)/auth
      "^/verify(/.*)?$", // standalone /verify
      "^/login(/.*)?$", // login from (marketing)
    ],
  })
}
