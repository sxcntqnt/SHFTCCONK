import { z } from "zod"

export const vehicleCreateSchema = z.object({
  registration: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  chassis: z.string().min(1).max(200),
  vehicle_type: z.string().min(1).max(100),
  group_id: z.string().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  model: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  engine: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  manufactured_by: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  color: z.string().max(100).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  registration_expiry: z.string().max(50).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  device_id: z.string().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  api_url: z.string().url().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  api_username: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
  api_password: z.string().max(200).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type VehicleCreate = z.infer<typeof vehicleCreateSchema>
