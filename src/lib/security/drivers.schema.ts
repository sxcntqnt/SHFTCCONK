import { z } from "zod"

export const driverCreateSchema = z.object({
  name: z.string().min(1).max(200),
  license: z.string().min(1).max(200),
  vehicle_id: z.string().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type DriverCreate = z.infer<typeof driverCreateSchema>
