import { describe, expect, it } from 'vitest';
import { completionSchema, registrationSchema, verificationSchema } from '@/modules/id/model/validation';
import { defaultMessages } from '@/shared/i18n/messages';

const PASSWORD_36 = 36;
const PASSWORD_37 = 37;

const { ru, en } = defaultMessages;

describe('access input boundaries', () => {
    it.each(['firstName', 'lastName', 'patronymic'])('limits %s to ten characters', (field) => {
        const input = { firstName: 'Анна', lastName: 'Иванова', email: 'anna@example.com', locale: 'ru' };
        expect(registrationSchema.safeParse({ ...input, [field]: 'я'.repeat(10) }).success).toBe(true);
        expect(registrationSchema.safeParse({ ...input, [field]: 'я'.repeat(11) }).success).toBe(false);
    });
    it('accepts an optional middle name and trims names', () => {
        const result = registrationSchema.parse({
            firstName: ' Анна ',
            lastName: ' Иванова ',
            email: 'anna@example.com',
            locale: 'ru',
        });

        expect(result.firstName).toBe('Анна');
        expect(result.patronymic).toBeUndefined();
    });

    it('rejects empty names, unsupported locales and malformed email', () => {
        expect(
            registrationSchema.safeParse({
                firstName: ' ',
                lastName: 'A',
                email: 'invalid',
                locale: 'fr',
            }).success,
        ).toBe(false);
    });

    it('enforces the BCrypt UTF-8 byte limit', () => {
        expect(completionSchema.safeParse({ password: 'я'.repeat(PASSWORD_36) }).success).toBe(true);
        expect(completionSchema.safeParse({ password: 'я'.repeat(PASSWORD_37) }).success).toBe(false);
        expect(completionSchema.safeParse({ password: 'short' }).success).toBe(false);
    });

    it('accepts exactly six numeric code digits', () => {
        const id = 'f2f9d795-c5dd-4a90-89ca-2dadb8dc1124';

        expect(verificationSchema.safeParse({ id, code: '001234' }).success).toBe(true);
        expect(verificationSchema.safeParse({ id, code: '12345a' }).success).toBe(false);
        expect(verificationSchema.safeParse({ id: '../admin', code: '001234' }).success).toBe(false);
    });

    it('keeps all translation namespaces and keys consistent', () => {
        expect(Object.keys(ru)).toEqual(Object.keys(en));
        Object.keys(ru).forEach((namespace) => {
            const key = namespace as keyof typeof ru;

            expect(Object.keys(ru[key]).sort()).toEqual(Object.keys(en[key]).sort());
        });
    });
});
