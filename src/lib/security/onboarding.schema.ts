import { z } from "zod"

export const profileCreateSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().min(5).max(50).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  companyName: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  website: z.string().url().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  startingLocations: z.string().max(1000).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  destinations: z.string().max(1000).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  highwayCorridors: z.array(z.string()).optional().default([]),
  routesToTrack: z.array(z.string()).optional().default([]),
  preferredVehicleType: z.array(z.string()).optional().default([]),
  socialMediaLinks: z.string().max(1000).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  emergencyContacts: z.string().max(1000).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  languagesSpoken: z.array(z.string()).optional().default([]),
  timeZone: z.string().max(100).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  workingHoursStart: z.string().max(50).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  workingHoursEnd: z.string().max(50).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  orgIds: z.array(z.string()).optional().default([]),
})

export type ProfileCreate = z.infer<typeof profileCreateSchema>

export const setIntentSchema = z.object({
  intent: z.string().min(1),
})

export const submitKycSchema = z.object({
  ballerineCaseId: z.string().min(1),
})

export type SetIntentInput = z.infer<typeof setIntentSchema>
export type SubmitKycInput = z.infer<typeof submitKycSchema>
