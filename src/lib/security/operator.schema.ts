import { z } from "zod"

export const operatorWithdrawSchema = z.object({
  amount: z
    .preprocess((v) => Number(v), z.number().int().gte(10).lte(150_000)),
  phone: z.string().regex(/^\+254[17]\d{8}$/, "Invalid Kenyan phone (+254...)"),
})

export const operatorSettleSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number().int().gte(100)),
  shortcode: z.string().regex(/^\d{5,6}$/, "Enter a valid 5–6 digit paybill or till number"),
  reference: z.string().max(500).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type OperatorWithdraw = z.infer<typeof operatorWithdrawSchema>
export type OperatorSettle = z.infer<typeof operatorSettleSchema>
