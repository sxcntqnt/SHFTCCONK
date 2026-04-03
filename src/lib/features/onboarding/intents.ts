export const SELF_SELECTABLE_INTENTS = ["passenger"] as const
export type SelfSelectIntent = (typeof SELF_SELECTABLE_INTENTS)[number]

export const VALID_INTENTS = [
  "passenger",
  "crew",
  "operator",
  "owner",
  "org",
] as const

export type OnboardingIntent = (typeof VALID_INTENTS)[number]

export function isValidIntent(value: string): value is OnboardingIntent {
  return VALID_INTENTS.includes(value as OnboardingIntent)
}

export function intentToDashboard(intent: string): string {
  switch (intent) {
    case "crew":
      return "/crew/dashboard"
    case "operator":
      return "/operator/dashboard"
    case "owner":
    case "org":
      return "/org/select"
    default:
      return "/app/dashboard"
  }
}
