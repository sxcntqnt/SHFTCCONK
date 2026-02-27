import Redis from 'ioredis';
import {
  TILE38_HOST,
  TILE38_PORT,
  TILE38_PASSWORD,
  TILE38_TLS
} from '$env/static/private';

let redis: Redis;

declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedisClient() {
  return new Redis({
    host: TILE38_HOST,
    port: Number(TILE38_PORT),
    password: TILE38_PASSWORD || undefined,
    tls: TILE38_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null, // prevents silent failures
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    }
  });
}

if (process.env.NODE_ENV === 'production') {
  redis = createRedisClient();
} else {
  if (!global._redis) {
    global._redis = createRedisClient();
  }
  redis = global._redis;
}

/* =========================
   CONNECTION EVENT LOGGING
========================= */

redis.on('connect', () => {
  console.log('Tile38 connected');
});

redis.on('error', (err) => {
  console.error('Tile38 connection error:', err);
});

redis.on('reconnecting', () => {
  console.warn('Reconnecting to Tile38...');
});

export default redis;