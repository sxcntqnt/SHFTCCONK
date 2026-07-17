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

// gatebill's /api/v1/kyc/submit needs the applicant's declared ID details
// as text (it doesn't OCR them) plus the two images the Ballerine SDK
// capture step produces. File inputs come through FormData as File/Blob,
// so they're validated with instanceof rather than z.string().
const kycImageField = z
  .instanceof(File)
  .refine((f) => f.size > 0, "Image is required")
  .refine((f) => f.size <= 10 * 1024 * 1024, "Image must be under 10MB")
  .refine(
    (f) => ["image/jpeg", "image/png"].includes(f.type),
    "Image must be JPEG or PNG",
  )

export const submitKycSchema = z.object({
  idNumber: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  // matches gatebill's supported id_type values for KE/NG/GH
  idType: z.enum(["NATIONAL_ID", "ALIEN_ID", "PASSPORT", "VOTER_ID", "DRIVING_LICENCE"]),
  countryCode: z.enum(["KE", "NG", "GH"]),
  selfie: kycImageField,
  idImage: kycImageField,
})

export type SetIntentInput = z.infer<typeof setIntentSchema>
export type SubmitKycInput = z.infer<typeof submitKycSchema>
