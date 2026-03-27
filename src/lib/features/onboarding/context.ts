import { getContext, setContext } from "svelte"
import type { OnboardingContext } from "./types"

const ONBOARDING_CONTEXT_KEY = Symbol("onboarding-context")

export function setOnboardingContext(context: OnboardingContext) {
  setContext(ONBOARDING_CONTEXT_KEY, context)
}

export function getOnboardingContext(): OnboardingContext {
  const context = getContext<OnboardingContext>(ONBOARDING_CONTEXT_KEY)
  if (!context) {
    throw new Error("Onboarding context not found. Make sure to call setOnboardingContext first.")
  }
  return context
}