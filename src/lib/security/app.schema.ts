import { z } from "zod"

export const subscribeSchema = z.object({
  route_ids: z.preprocess((v) => {
    if (Array.isArray(v)) return v.filter(Boolean)
    if (typeof v === "string") return v ? [v] : []
    return []
  }, z.array(z.string()).optional()),
  all_routes: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional().default(false),
})

export const actorRequestSchema = z.object({
  role: z.string().min(1, "Please select a role"),
  note: z.preprocess((v) => {
    if (typeof v === "string") return v.trim() || null
    return null
  }, z.string().nullable().optional()),
})

export type SubscribeInput = z.infer<typeof subscribeSchema>
export type ActorRequestInput = z.infer<typeof actorRequestSchema>

export const calendarAddSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)"),
  time: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  mode: z.enum(["Car", "Train", "Bike", "Walk"]),
  notes: z.preprocess((v) => (typeof v === "string" ? v.trim() || "" : ""), z.string()),
})

export type CalendarAddInput = z.infer<typeof calendarAddSchema>

export const orgJoinSchema = z.object({
  org_id: z.string().uuid("Please select a valid organization id"),
})

export type OrgJoinInput = z.infer<typeof orgJoinSchema>
