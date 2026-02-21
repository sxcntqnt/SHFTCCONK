import { z } from 'zod';

export const contactSchema = z.object({
  first: z
    .string()
    .min(2)
    .max(100),

  last: z
    .string()
    .min(2)
    .max(100),

  email: z
    .string()
    .email()
    .max(200)
    .transform((val) => val.toLowerCase()),

  phone: z
    .string()
    .max(50)
    .regex(/^[+0-9()\-\s]*$/, 'Invalid phone format')
    .optional()
    .or(z.literal('')),

  org: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('')),

  type: z
    .string()
    .min(1)
    .max(100),

  message: z
    .string()
    .min(1)
    .max(2000),
});