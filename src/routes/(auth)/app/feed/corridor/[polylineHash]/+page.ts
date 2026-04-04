// src/routes/feed/corridor/[polylineHash]/+page.ts
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ params }) => {
  const { polylineHash } = params

  if (!polylineHash || polylineHash.length < 10) {
    throw new Error("Invalid corridor hash")
  }

  return {
    polylineHash,
  }
}
