import { z } from "zod"

export const updateEmailSchema = z.object({
  email: z.string().email("A valid email address is required"),
})

export const updatePasswordSchema = z.object({
  newPassword1: z.string().min(6).max(72),
  newPassword2: z.string().min(6).max(72),
  currentPassword: z.string().optional(),
}).superRefine((vals, ctx) => {
  if (vals.newPassword1 !== vals.newPassword2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "The passwords don't match", path: ["newPassword1"] })
  }
})

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "You must provide your current password to delete your account")
})

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(50),
  companyName: z.string().min(1).max(50),
  website: z.string().min(1).max(50),
})

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
