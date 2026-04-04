// lib/utils/logger.ts
export const logger = {
  info: (...args: any[]) => {
    console.info(`[INFO] [${new Date().toISOString()}]`, ...args)
  },
  warn: (...args: any[]) => {
    console.warn(`[WARN] [${new Date().toISOString()}]`, ...args)
  },
  error: (...args: any[]) => {
    console.error(`[ERROR] [${new Date().toISOString()}]`, ...args)
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] [${new Date().toISOString()}]`, ...args)
    }
  },
  trace: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.trace(`[TRACE] [${new Date().toISOString()}]`, ...args)
    }
  },
}

export type SecurityEvent =
  | "RATE_LIMIT_BLOCK"
  | "DUPLICATE_SUBMISSION"
  | "INVALID_RECAPTCHA"
  | "VALIDATION_FAILURE"
  | "PAYLOAD_BLOCKED"

export function logSecurityEvent(
  event: SecurityEvent,
  meta: Record<string, unknown>,
) {
  console.warn(
    JSON.stringify({
      level: "SECURITY",
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    }),
  )
}
