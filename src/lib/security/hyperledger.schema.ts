import { z } from "zod"

export const revokeSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1).optional().default("privilegewithdrawn"),
  entityType: z.string().optional().default("driver"),
})

export const enrollUserSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  orgId: z.string().min(1),
  affiliation: z.string().min(1).optional().default("platform.users"),
})

export const enrollDeviceSchema = z.object({
  deviceId: z.string().min(1),
  vehicleId: z.string().optional().nullable(),
  orgId: z.string().min(1),
  location: z.string().optional().default("unknown"),
})

export type RevokeInput = z.infer<typeof revokeSchema>
export type EnrollUserInput = z.infer<typeof enrollUserSchema>
export type EnrollDeviceInput = z.infer<typeof enrollDeviceSchema>
