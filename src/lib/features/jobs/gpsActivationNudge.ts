import { Redis } from '@upstash/redis'

/*
  enqueueActivationNudges(org_id, phone_number, signup_at)
  - Schedules two delayed nudges at T+4h and T+24h using Upstash Redis sorted set
  - Stores job ids in a Redis hash 'nudge:org:{org_id}' for later cancellation

  cancelNudgeJobs(org_id)
  - Reads the hash, removes scheduled job ids from sorted set, and deletes the hash

  Decisions:
  - We use a sorted set 'nudge:scheduled' containing job_id members with score = fire_at_epoch_ms.
  - A separate Redis hash 'nudge:org:{org_id}' maps to job ids for idempotent cancellation.
  - This implementation assumes a worker exists that polls the sorted set for due jobs and fires the SMS.
*/

const r = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
})

function jobKey(org_id: string) {
  return `nudge:org:${org_id}`
}

export async function enqueueActivationNudges(org_id: string, phone_number: string, signup_at: Date) {
  if (!org_id || !phone_number || !signup_at) throw new Error('missing args')

  const hour4At = signup_at.getTime() + 4 * 60 * 60 * 1000
  const hour24At = signup_at.getTime() + 24 * 60 * 60 * 1000

  const hour4_job_id = crypto.randomUUID()
  const hour24_job_id = crypto.randomUUID()

  // Worker expects sorted set key 'nudge:scheduled'
  await r.zadd('nudge:scheduled', { score: hour4At, member: hour4_job_id })
  await r.zadd('nudge:scheduled', { score: hour24At, member: hour24_job_id })

  // Store mapping for cancellation
  const hk = jobKey(org_id)
  await r.hset(hk, { hour4_job_id, hour24_job_id, phone_number })

  return { hour4_job_id, hour24_job_id }
}

export async function cancelNudgeJobs(org_id: string) {
  const hk = jobKey(org_id)
  const mapping = await r.hgetall(hk)
  if (!mapping || Object.keys(mapping).length === 0) return { cancelled: [] }

  const cancelled: string[] = []
  const ids = [mapping.hour4_job_id, mapping.hour24_job_id].filter(Boolean)
  for (const id of ids) {
    try {
      // Remove member from sorted set if it exists
      await r.zrem('nudge:scheduled', id)
      cancelled.push(id)
    } catch (e) {
      // If removal fails or job already executed, continue silently
      console.warn('cancelNudgeJobs: zrem failed for', id, e)
    }
  }

  // Delete the mapping hash after attempting cancellation
  await r.del(hk)
  return { cancelled }
}

export default { enqueueActivationNudges, cancelNudgeJobs }
