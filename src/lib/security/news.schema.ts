import { z } from "zod"

export const newsCreateSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  category: z.string().max(100).optional().default("general"),
  severity: z.string().max(50).optional().default("info"),
  pinned: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional().default(false),
  published: z.preprocess((v) => v === "false" ? false : v === "true" || v === true, z.boolean()).optional().default(true),
  route_ids: z.array(z.string()).optional().default([]),
})

export const newsUpdateSchema = newsCreateSchema.extend({
  id: z.string().min(1),
})

export type NewsCreate = z.infer<typeof newsCreateSchema>

export const idSchema = z.object({ id: z.string().min(1) })

export type IdSchema = z.infer<typeof idSchema>
