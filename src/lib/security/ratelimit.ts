import { Redis } from "@upstash/redis"
import { logSecurityEvent } from "$lib/utils/logger"
import { env } from "$env/dynamic/private"

if (!env.UPSTASH_REDIS_REST_URL) {
  console.error("Missing UPSTASH_REDIS_REST_URL")
}

if (!env.UPSTASH_REDIS_REST_TOKEN) {
  console.error("Missing UPSTASH_REDIS_REST_TOKEN")
}

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function rateLimit(ip: string, limit = 10, windowSeconds = 60) {
  const key = `rate:${ip}`
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }

  if (current > limit) {
    logSecurityEvent("RATE_LIMIT_BLOCK", { ip })
    return false
  }

  return true
}
