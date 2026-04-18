import { z } from "zod"

export const vehicleGroupCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default("")
})

export type VehicleGroupCreate = z.infer<typeof vehicleGroupCreateSchema>
