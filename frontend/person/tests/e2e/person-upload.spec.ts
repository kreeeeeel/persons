import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';
const ID = process.env.E2E_ID_URL ?? 'http://localhost:3000';

test('uploads a real video, prepares its preview, reviews tagged people and publishes the gallery card', async ({
    page,
    baseURL,
}) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(15000);
    const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
        email: string;
        password: string;
    };
    await page.goto(`${ID}/ru?returnTo=${encodeURIComponent('/person/ru/krel')}`);
    await page.getByLabel('Электронная почта', { exact: true }).fill(account.email);
    await page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/krel$/);
    const caption = `Момент проверки ${Date.now()}`;
    let requestId: string | undefined;
    let mediaId: string | undefined;
    let published = false;
    try {
        await page.getByRole('tab', { name: /Моменты/ }).click();
        await page.getByRole('button', { name: 'Добавить момент', exact: true }).click();
        await page
            .getByLabel('Выбрать файл', { exact: true })
            .setInputFiles(path.resolve('../../.build/demo-moment.mp4'));
        await page.getByRole('textbox', { name: 'Подпись', exact: true }).fill(caption);
        await page.getByLabel('Кто отмечен', { exact: true }).click();
        const filter = page.getByPlaceholder('Имя или тег персоны');
        await filter.fill('Крел');
        await page.getByRole('option', { name: 'Крел', exact: true }).click();
        await filter.press('Escape');
        const upload = page.waitForResponse(
            (response) => response.url().includes('/media') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
        const response = await upload;
        expect(response.status()).toBe(202);
        requestId = ((await response.json()) as { id: string }).id;
        const pendingCard = page.getByRole('button', { name: caption, exact: true });
        await expect(pendingCard.getByText('На модерации')).toBeVisible();
        await pendingCard.click();
        const pendingDialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
        await expect(pendingDialog.getByText('На модерации')).toBeVisible();
        await expect(pendingDialog.getByRole('button', { name: 'Нравится', exact: true })).toBeDisabled();
        await expect(pendingDialog.getByRole('textbox')).toHaveCount(0);
        await pendingDialog.getByRole('button', { name: /Закрыть|Close/ }).click();
        const queue = (await (
            await page.request.get(`${ADMIN}/api/person/v1/admin/moderation?status=PENDING&size=50`)
        ).json()) as { items: { id: string; payload: string }[] };
        mediaId = (JSON.parse(queue.items.find(({ id }) => id === requestId)!.payload) as { mediaId: string }).mediaId;
        await page.goto(`${ADMIN}/ru/moderation`);
        await page.getByRole('button', { name: 'Предлагаемые данные', exact: true }).first().waitFor();
        for (const button of await page.getByRole('button', { name: 'Предлагаемые данные', exact: true }).all()) {
            await button.click();
        }
        const request = page.getByRole('article').filter({ hasText: caption });
        await expect(request.getByText('Крел', { exact: true })).toBeVisible();
        await request.getByRole('button', { name: 'Согласовать', exact: true }).click();
        await expect(page.getByText('Решение сохранено.')).toBeVisible();
        published = true;
        await page.goto(`${baseURL}/krel`);
        await page.getByRole('tab', { name: /Моменты/ }).click();
        const card = page.getByRole('button', { name: caption, exact: true });
        await expect(card.getByText('00:08')).toBeVisible();
        await expect(card.locator('img')).toHaveAttribute('src', /\/preview$/);
        mediaId = (await card.locator('img').getAttribute('src'))!.split('/').at(-2)!;
        await card.click();
        const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
        await expect(dialog.getByRole('link', { name: 'Крел', exact: true })).toBeVisible();
        await expect
            .poll(() => dialog.locator('video').evaluate((element) => (element as HTMLVideoElement).readyState))
            .toBeGreaterThan(0);
    } finally {
        if (published && mediaId) {
            const removal = await page.request.delete(`${baseURL}/api/person/v1/media/${mediaId}`, {
                headers: { origin: baseURL! },
            });
            expect(removal.status()).toBe(202);
            const receipt = (await removal.json()) as { id: string };
            const decision = await page.request.post(`${ADMIN}/api/person/v1/admin/moderation/${receipt.id}/decision`, {
                headers: { origin: ADMIN },
                data: { decision: 'APPROVE' },
            });
            expect(decision.status()).toBe(200);
        } else if (requestId && !published) {
            await page.request.post(`${ADMIN}/api/person/v1/admin/moderation/${requestId}/decision`, {
                headers: { origin: ADMIN },
                data: { decision: 'REJECT', reason: 'Проверка загрузки завершена' },
            });
        }
        await page.goto(`${baseURL}/ru`);
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Выйти из устройства', { exact: true }).click();
    }
});
