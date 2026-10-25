import { createHmac, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { Configuration, IdApi } from '@persons/id-client';
import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const ADMIN_EMAIL = 'admin-e2e@persons.example.test';
const ID_URL = 'http://localhost:8081';
const PERSON_URL = 'http://localhost:8087/person';
const ADMIN_URL = 'http://localhost:3001';
const MAILPIT_URL = 'http://localhost:8025';
const MAIL_TIMEOUT_MS = 20000;

function serviceHeaders() {
    const secret = process.env.PROJECT_INTERNAL_JWT_SECRET;

    if (!secret) {
        throw new Error('PROJECT_INTERNAL_JWT_SECRET is required for live admin tests.');
    }

    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
        iss: 'persons',
        sub: 'live-admin-e2e',
        aud: 'persons-internal',
        scope: 'service',
        iat: now,
        exp: now + 120,
        jti: randomUUID(),
    })}`;
    const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');

    return { 'X-Service-Authorization': `Bearer ${unsigned}.${signature}` };
}

async function register(request: APIRequestContext, email: string) {
    const api = new IdApi(new Configuration({ basePath: ID_URL, headers: serviceHeaders() }));
    const challenge = await api.beginRegistration({
        register: { email, firstName: 'Тестовый', lastName: 'Персонаж', locale: 'ru' },
    });
    let code = '';

    await expect
        .poll(
            async () => {
                const inbox: { messages: { ID: string; To: { Address: string }[] }[] } = await (
                    await request.get(`${MAILPIT_URL}/api/v1/messages`)
                ).json();
                const message = inbox.messages.find((item) => item.To.some((recipient) => recipient.Address === email));

                if (!message) {
                    return false;
                }

                const mail: { HTML: string } = await (
                    await request.get(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
                ).json();

                code = mail.HTML.match(/>\s*(\d{6})\s*</)?.[1] ?? '';

                return code.length === 6;
            },
            { timeout: MAIL_TIMEOUT_MS },
        )
        .toBe(true);

    const verification = await api.verifyChallenge({ id: challenge.id, verify: { code } });

    return api.completeRegistration({
        completeRegistration: {
            challengeId: challenge.id,
            grant: verification.grant,
            password: 'local-e2e-fixture-password',
        },
    });
}

test('admin searches people and blocks access through the separate backend', async ({ page, context, request }) => {
    test.skip(
        process.env.E2E_ADMIN_BOOTSTRAP !== 'true',
        'Requires an isolated local stack with the explicit test bootstrap email',
    );
    test.setTimeout(90000);

    const owner = await register(request, ADMIN_EMAIL);
    const friend = await register(request, `e2e-target-${randomUUID()}@example.test`);
    const ownerApi = new IdApi(
        new Configuration({ basePath: ID_URL, accessToken: owner.token, headers: serviceHeaders() }),
    );

    await writeFile(
        'test-results/admin-fixtures.json',
        JSON.stringify({ owner: owner.user.id, friend: friend.user.id }),
    );
    await expect.poll(async () => (await ownerApi.getMe()).role, { timeout: 15000 }).toBe('ADMIN');
    await context.addCookies([
        { name: 'PERSONS_SESSION', value: owner.token, url: ADMIN_URL, httpOnly: true, sameSite: 'Lax' },
    ]);
    await page.goto(`${ADMIN_URL}/ru`);
    await expect(page.getByRole('heading', { name: 'Пользователи', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Имя или электронная почта' }).fill(friend.user.email);
    await page.getByRole('button', { name: 'Найти', exact: true }).click();
    await expect(page.getByText(friend.user.email, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Изменить доступ', exact: true }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await dialog.getByText('Активен', { exact: true }).click();
    await page.getByText('Заблокирован', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Заблокирован', { exact: true })).toBeVisible();
    const denied = await request.get(`${ID_URL}/v1/me`, {
        headers: { ...serviceHeaders(), Authorization: `Bearer ${friend.token}` },
    });

    expect(denied.status()).toBe(401);
    const lastAdmin = await request.put(`${PERSON_URL}/v1/admin/users/${owner.user.id}/access`, {
        headers: { ...serviceHeaders(), Authorization: `Bearer ${owner.token}` },
        data: { role: 'USER', status: 'BLOCKED' },
    });

    expect(lastAdmin.status()).toBe(403);
    await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true, animations: 'disabled' });
});
