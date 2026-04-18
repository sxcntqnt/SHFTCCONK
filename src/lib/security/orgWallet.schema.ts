import { z } from "zod"

export const orgSettleSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number().int().gte(100)),
  shortcode: z.string().regex(/^\d{5,6}$/, "Enter a valid 5–6 digit paybill or till number"),
  reference: z.string().max(500).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type OrgSettle = z.infer<typeof orgSettleSchema>
