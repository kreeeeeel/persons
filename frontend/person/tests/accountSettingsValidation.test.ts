import { expect, it } from 'vitest';
import { emailChangeSchema, passwordChangeSchema } from '@/modules/account/model/settingsValidation';

it('rejects mismatching passwords and passwords over the bcrypt byte limit', () => {
    expect(
        passwordChangeSchema.safeParse({
            currentPassword: 'old',
            password: 'new-password-123',
            confirmation: 'different',
        }).success,
    ).toBe(false);
    const long = 'я'.repeat(37);
    expect(passwordChangeSchema.safeParse({ currentPassword: 'old', password: long, confirmation: long }).success).toBe(
        false,
    );
    expect(
        passwordChangeSchema.safeParse({
            currentPassword: 'old',
            password: 'new-password-123',
            confirmation: 'new-password-123',
        }).success,
    ).toBe(true);
});

it('requires a current password and supported locale before starting an email challenge', () => {
    expect(
        emailChangeSchema.safeParse({ email: 'friend@example.test', currentPassword: '', locale: 'ru' }).success,
    ).toBe(false);
    expect(
        emailChangeSchema.safeParse({ email: 'friend@example.test', currentPassword: 'password', locale: 'en' })
            .success,
    ).toBe(true);
});
