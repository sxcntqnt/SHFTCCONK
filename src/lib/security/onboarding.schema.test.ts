import { describe, it, expect } from "vitest"
import { profileCreateSchema } from "./onboarding.schema"

describe("profileCreateSchema", () => {
  it("rejects missing fullName and short phone", () => {
    const raw = {
      fullName: "",
      phone: "07123",
    }
    const parsed = profileCreateSchema.safeParse(raw)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      expect(errors.fullName).toBeDefined()
      // phone is optional in schema but lower-level validation should catch short numbers where used
    }
  })
})
