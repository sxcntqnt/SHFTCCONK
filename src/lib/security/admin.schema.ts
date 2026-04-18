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

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

export const requestIdSchema = z.object({ request_id: z.string().regex(UUID_RE) })

export const actorRequestApproveSchema = z.object({
  request_id: z.string().regex(UUID_RE),
  binding_type: z.string().optional().nullable(),
  binding_target: z.string().optional().nullable(),
})

export type AdminUpdateProfile = z.infer<typeof adminUpdateProfileSchema>
