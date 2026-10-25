import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { Configuration, IdApi } from '@persons/id-client';

test('email verification, return to person, account menu, session metadata and device logout', async ({
    page,
    context,
    request,
}) => {
    test.skip(process.env.E2E_LIVE_STACK !== 'true', 'Requires Compose with the Mailpit test override');
    test.setTimeout(120000);
    const email = `person-e2e-${randomUUID()}@example.test`;
    const password = 'local-test-password-2026';
    const fixturePath = path.resolve('../../.build/person-live-fixture.json');
    await writeFile(fixturePath, JSON.stringify({ email }));
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': '203.0.113.77' });
    await page.goto('/ru');
    await page.getByRole('link', { name: 'Войти', exact: true }).click();
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await page.getByLabel('Имя', { exact: true }).fill('Тестовый');
    await page.getByLabel('Фамилия', { exact: true }).fill('Персонаж');
    await page.getByLabel('Электронная почта', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();
    let code = '';

    await expect
        .poll(
            async () => {
                const inbox = await (await request.get('http://localhost:8025/api/v1/messages')).json();
                const message = inbox.messages.find((item: { To: { Address: string }[] }) =>
                    item.To.some((recipient) => recipient.Address === email),
                );

                if (!message) {
                    return false;
                }

                const mail = await (await request.get(`http://localhost:8025/api/v1/message/${message.ID}`)).json();
                expect(mail.HTML).toContain('#713be8');
                expect(mail.HTML).toContain('Персонажи');
                expect(mail.HTML).not.toContain('th:text=');
                await writeFile(path.resolve('../../.build/person-code-email.html'), mail.HTML);
                code = mail.HTML.match(/>\s*(\d{6})\s*</)?.[1] ?? '';

                return code.length === 6;
            },
            { timeout: 30000 },
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
    await page.getByLabel('Придумайте пароль', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Открыть Персонажи', exact: true }).click();
    await expect(page).toHaveURL('http://localhost:3002/ru');
    const account = page.getByRole('button', { name: 'Аккаунт: Тестовый' });
    await expect(account).toBeVisible();
    const cookie = (await context.cookies()).find((item) => item.name === 'PERSONS_SESSION');
    expect(cookie?.httpOnly).toBe(true);

    if (!cookie) {
        throw new Error('Session cookie missing');
    }

    const api = new IdApi(new Configuration({ basePath: 'http://localhost:8081', accessToken: cookie.value }));
    const user = await api.getMe();
    await writeFile(fixturePath, JSON.stringify({ email, id: user.id }));
    expect(user.hasAvatar).toBe(true);
    expect((await context.request.get('/api/avatar')).ok()).toBe(true);
    const sessions = await api.listSessions();
    const current = sessions.items.find((item) => item.current);
    expect(current?.browser).toContain('Chrome');
    expect(current?.os).not.toBe('');
    expect(current?.ip).not.toBe('');
    expect(current?.ip).not.toBe('203.0.113.77');
    expect(current?.origin).toBe('persons-id-web');
    expect(current?.createdAt.getTime()).toBeGreaterThan(Date.now() - 120000);
    const otherSession = await new IdApi(new Configuration({ basePath: 'http://localhost:8081' })).createSession({
        credentials: { email, password },
    });
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const capsule = await account.boundingBox();
    const wordmark = await page.getByText('Те ещё люди.', { exact: true }).boundingBox();
    expect((capsule?.x ?? 0) + (capsule?.width ?? 0)).toBeLessThanOrEqual(308);
    expect((wordmark?.x ?? 0) + (wordmark?.width ?? 0)).toBeLessThanOrEqual((capsule?.x ?? 0) - 4);
    await account.click();
    await expect(page.getByText('Моя страница', { exact: true })).toBeVisible();
    await page.screenshot({ path: '../../.build/person-account-mobile.png', fullPage: true, animations: 'disabled' });
    await page.getByText('Настройки', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Разделы настроек' }).click();
    await page.getByRole('option', { name: 'Сессии', exact: true }).click();
    await expect(page).toHaveURL('http://localhost:3002/ru');
    await expect(page.getByRole('dialog', { name: 'Настройки' })).toContainText('Текущее устройство');
    await page.goto('http://localhost:3002/ru');
    await page.getByRole('button', { name: 'Аккаунт: Тестовый' }).click();
    await page.getByText('Выйти из устройства', { exact: true }).click();
    await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
    expect((await context.cookies()).some((item) => item.name === 'PERSONS_SESSION')).toBe(false);
    await expect(api.getMe()).rejects.toMatchObject({ response: { status: 401 } });
    const other = new IdApi(new Configuration({ basePath: 'http://localhost:8081', accessToken: otherSession.token }));
    expect((await other.getMe()).email).toBe(email);
    const otherSessions = await other.listSessions();
    const active = otherSessions.items.find((item) => item.current);

    if (active) {
        await other.revokeSession({ id: active.id });
    }
});
