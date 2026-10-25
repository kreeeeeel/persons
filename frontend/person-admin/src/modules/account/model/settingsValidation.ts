import { z } from 'zod';

const PASSWORD_SCHEMA_10 = 10;
const PASSWORD_SCHEMA_72 = 72;
const EMAIL_254 = 254;
const CURRENT_PASSWORD_1 = 1;
const CURRENT_PASSWORD_72 = 72;

export const passwordSchema = z
    .string()
    .min(PASSWORD_SCHEMA_10)
    .max(PASSWORD_SCHEMA_72)
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_SCHEMA_72);
export const emailChangeSchema = z.object({
    email: z.string().trim().email().max(EMAIL_254),
    currentPassword: z.string().min(CURRENT_PASSWORD_1).max(CURRENT_PASSWORD_72),
    locale: z.enum(['ru', 'en']),
});
export const passwordChangeSchema = z
    .object({
        currentPassword: z.string().min(CURRENT_PASSWORD_1).max(CURRENT_PASSWORD_72),
        password: passwordSchema,
        confirmation: z.string(),
    })
    .refine((value) => value.password === value.confirmation, { path: ['confirmation'] });
