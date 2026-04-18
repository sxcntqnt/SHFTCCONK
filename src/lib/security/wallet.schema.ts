import { z } from "zod"

export const topupSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number().int().min(50).max(100000)),
  phone: z.string().regex(/^\+254[17]\d{8}$/, "Enter a valid Kenyan phone (+254...)")
})

export const fuelAddSchema = z.object({
  date: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional()),
  vehicleId: z.string().min(1, "vehicleId is required"),
  odometer: z.preprocess((v) => Number(v), z.number().int().nonnegative()),
  liters: z.preprocess((v) => Number(v), z.number().positive()),
  pricePerLiter: z.preprocess((v) => Number(v), z.number().nonnegative()),
  totalCost: z.preprocess((v) => Number(v), z.number().nonnegative()),
  notes: z.preprocess((v) => (typeof v === "string" ? v.trim() || null : null), z.string().nullable().optional()),
})

export type TopupInput = z.infer<typeof topupSchema>
export type FuelAddInput = z.infer<typeof fuelAddSchema>
