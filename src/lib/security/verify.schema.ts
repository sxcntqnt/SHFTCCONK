import { z } from "zod"

export const verifySmsSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
  profile_id: z.string().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type VerifySms = z.infer<typeof verifySmsSchema>
