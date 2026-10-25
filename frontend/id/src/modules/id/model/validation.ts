import { z } from 'zod';

const EMAIL_254 = 254;
const PASSWORD_10 = 10;
const PASSWORD_72 = 72;
const FIRST_NAME_1 = 1;
const MAX_NAME_LENGTH = 10;
const LAST_NAME_1 = 1;
const PASSWORD_1 = 1;
const AVATAR_BASE64_400000 = 400000;

const email = z.email().max(EMAIL_254);
const password = z
    .string()
    .min(PASSWORD_10)
    .max(PASSWORD_72)
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_72);

export const registrationSchema = z.object({
    firstName: z.string().trim().min(FIRST_NAME_1).max(MAX_NAME_LENGTH),
    lastName: z.string().trim().min(LAST_NAME_1).max(MAX_NAME_LENGTH),
    patronymic: z.string().trim().max(MAX_NAME_LENGTH).optional(),
    email,
    locale: z.enum(['ru', 'en']),
});
export const credentialsSchema = z.object({ email, password: z.string().min(PASSWORD_1).max(PASSWORD_72) });
export const recoverySchema = z.object({ email, locale: z.enum(['ru', 'en']) });
export const verificationSchema = z.object({ id: z.uuid(), code: z.string().regex(/^\d{6}$/) });
export const completionSchema = z.object({
    password,
    avatarBase64: z.string().max(AVATAR_BASE64_400000).optional(),
});
