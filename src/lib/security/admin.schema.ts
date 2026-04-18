import { z } from "zod"

export const adminUpdateProfileSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  company_name: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export const adminSendVerificationSchema = z.object({
  actor_id: z.string().min(1),
  method: z.enum(["sms", "email"]),
  destination: z.string().min(1),
})

export const adminActorIdSchema = z.object({ id: z.string().min(1) })

export type AdminUpdateProfile = z.infer<typeof adminUpdateProfileSchema>
