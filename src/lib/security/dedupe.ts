import { Redis } from '@upstash/redis';
import { logSecurityEvent } from '$lib/features/utils/logger';

import { env } from '$env/dynamic/private';

if (!env.UPSTASH_REDIS_REST_URL) {
  console.error('Missing UPSTASH_REDIS_REST_URL');
}

if (!env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_TOKEN');
}

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL!,
  token: env.UPSTASH_REDIS_REST_TOKEN!,
});;

export async function preventDuplicate(ip: string, email: string, windowMinutes = 5) {
  const key = `dedupe:${ip}:${email}`;
  const exists = await redis.get(key);

  if (exists) {
    logSecurityEvent('DUPLICATE_SUBMISSION', { ip, email });
    return false;
  }

  await redis.set(key, '1', {
    ex: windowMinutes * 60,
  });

  return true;
}