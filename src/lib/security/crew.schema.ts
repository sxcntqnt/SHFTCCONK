import { z } from "zod"

export const crewWithdrawSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number().int().min(10).max(150000)),
  phone: z.string().regex(/^\+254[17]\d{8}$/, "Enter a valid Kenyan phone (+254...)")
})

export type CrewWithdrawInput = z.infer<typeof crewWithdrawSchema>
