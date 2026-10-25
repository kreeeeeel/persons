import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const LIVE_TIMEOUT_MS = 90000;
const MAIL_TIMEOUT_MS = 20000;

test('registers through email, crops an avatar, signs in and revokes the session', async ({
    page,
    context,
    request,
}) => {
    test.skip(process.env.E2E_LIVE_STACK !== 'true', 'Requires the local Compose stack and Mailpit');
    test.setTimeout(LIVE_TIMEOUT_MS);
    const email = `e2e-${randomUUID()}@example.test`;
    const mailpit = process.env.E2E_MAILPIT_BASE_URL ?? 'http://localhost:8025';
    const id = process.env.E2E_ID_BASE_URL ?? 'http://localhost:8081';
    let code = '';

    await page.goto('/ru');
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await page.getByLabel('Имя', { exact: true }).fill('Тестовый');
    await page.getByLabel('Фамилия', { exact: true }).fill('Персонаж');
    await page.getByLabel('Электронная почта', { exact: true }).fill(email);
    await page.getByRole('checkbox', { name: /Я принимаю/ }).check();
    await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();

    await expect
        .poll(
            async () => {
                const inbox: { messages: { ID: string; To: { Address: string }[] }[] } = await (
                    await request.get(`${mailpit}/api/v1/messages`)
                ).json();
                const message = inbox.messages.find((item) => item.To.some((recipient) => recipient.Address === email));

                if (!message) {
                    return false;
                }

                const mail: { HTML: string } = await (
                    await request.get(`${mailpit}/api/v1/message/${message.ID}`)
                ).json();

                expect(mail.HTML).toContain('Персонажи');
                code = mail.HTML.match(/>\s*(\d{6})\s*</)?.[1] ?? '';

                return code.length === 6;
            },
            { timeout: MAIL_TIMEOUT_MS },
        )
        .toBe(true);

    await page.locator('input').first().focus();
    await page.keyboard.type(code);
    await page.getByRole('button', { name: 'Подтвердить почту', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Аватар и пароль' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(path.resolve('../assets/illustrations/friends-v1.webp'));
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Применить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByLabel('Придумайте пароль', { exact: true }).fill('local-test-password-2026');
    await page.getByRole('button', { name: 'Открыть Персонажи', exact: true }).click();
    await expect(page).toHaveURL(/\/ru\/home$/);
    await expect(page.getByText(email, { exact: true })).toBeVisible();

    const session = (await context.cookies()).find((cookie) => cookie.name === 'PERSONS_SESSION');

    expect(session?.httpOnly).toBe(true);
    if (!session) {
        throw new Error('Session cookie missing');
    }

    const profile = await request.get(`${id}/v1/me`, { headers: { Authorization: `Bearer ${session.value}` } });

    expect(profile.ok()).toBe(true);
    const user: { hasAvatar: boolean; role: string } = await profile.json();

    expect(user.hasAvatar).toBe(true);
    expect(user.role).toBe('USER');
    const avatar = await context.request.get('/api/avatar');

    expect(avatar.ok()).toBe(true);
    expect(avatar.headers()['content-type']).toContain('image/jpeg');
    await page.getByRole('button', { name: 'Выйти', exact: true }).click();
    await expect(page.getByLabel('Электронная почта', { exact: true })).toBeVisible();
    expect((await context.cookies()).some((cookie) => cookie.name === 'PERSONS_SESSION')).toBe(false);
    const revoked = await request.get(`${id}/v1/me`, { headers: { Authorization: `Bearer ${session.value}` } });

    expect(revoked.status()).toBe(401);
});
