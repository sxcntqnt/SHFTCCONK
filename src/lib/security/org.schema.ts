import { z } from "zod"

export const orgCreateSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type OrgCreate = z.infer<typeof orgCreateSchema>
