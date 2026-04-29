//configenv.ts
import { env } from '$env/static/private';``

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getNumber(name: string, fallback?: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback!;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for env var ${name}`);
  }
  return parsed;
}

function getBool(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true';
}

export const env = {
  CLICKHOUSE_HOST: getEnv('CLICKHOUSE_HOST', 'localhost'),
  CLICKHOUSE_PORT: getNumber('CLICKHOUSE_PORT', 8123),
  CLICKHOUSE_USER: getEnv('CLICKHOUSE_USER', 'default'),
  CLICKHOUSE_PASSWORD: getEnv('CLICKHOUSE_PASSWORD', ''),
  CLICKHOUSE_DATABASE: getEnv('CLICKHOUSE_DATABASE', 'default'),
  CLICKHOUSE_PROTOCOL: getEnv('CLICKHOUSE_PROTOCOL', 'http') as 'http' | 'https',

  CLICKHOUSE_POOL_SIZE: getNumber('CLICKHOUSE_POOL_SIZE', 10),
  CLICKHOUSE_CONNECTION_TIMEOUT: getNumber('CLICKHOUSE_CONNECTION_TIMEOUT', 30000),
  CLICKHOUSE_REQUEST_TIMEOUT: getNumber('CLICKHOUSE_REQUEST_TIMEOUT', 60000),
  CLICKHOUSE_QUERY_TIMEOUT: getNumber('CLICKHOUSE_QUERY_TIMEOUT', 5000),

  CLICKHOUSE_COMPRESSION: getBool('CLICKHOUSE_COMPRESSION', false),
  CLICKHOUSE_RETRY_ATTEMPTS: getNumber('CLICKHOUSE_RETRY_ATTEMPTS', 3),
  CLICKHOUSE_RETRY_DELAY: getNumber('CLICKHOUSE_RETRY_DELAY', 1000),
};