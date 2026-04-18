import { z } from "zod"

export const VALID_LEVELS = ["federal", "org", "branch", "department"] as const

export const jurisdictionCreateSchema = z
  .object({
    actor_id: z.string().min(1),
    level: z.enum(VALID_LEVELS as readonly string[]),
    scope_id: z.string().min(1).optional().nullable(),
  })
  .superRefine((vals, ctx) => {
    if (vals.level !== "federal") {
      if (!vals.scope_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scope is required for non-federal jurisdictions", path: ["scope_id"] })
      }
    } else {
      if (vals.scope_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Federal jurisdictions must not have a scope_id", path: ["scope_id"] })
      }
    }
  })

export const jurisdictionIdSchema = z.object({ id: z.string().min(1) })

export type JurisdictionCreate = z.infer<typeof jurisdictionCreateSchema>
export type JurisdictionId = z.infer<typeof jurisdictionIdSchema>
