import { z } from "zod"

export const switchContextSchema = z.object({
  context: z.enum(["passenger", "crew", "orgStaff"]),
  orgId: z.string().optional().nullable().or(z.literal("")).transform((v) => (v === "" ? null : v)),
})

export type SwitchContext = z.infer<typeof switchContextSchema>
