import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('opens paginated reaction authors below the full-width media', async ({ page }) => {
    await page.goto('/krel');
    await page.getByRole('tab', { name: /Фотографии/ }).click();
    await page.getByRole('button', { name: 'Тот самый человек из нашей компании' }).click();
    const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await expect(viewer.getByText('Кто отмечен', { exact: true })).toBeVisible();
    await expect(viewer.getByLabel(/Просмотры:/)).toBeVisible();
    const response = page.waitForResponse((r) => r.url().includes('/reactions?') && r.request().method() === 'GET');
    await viewer.getByRole('button', { name: /Кому понравилось:/ }).click();
    const authors = page.getByRole('dialog', { name: 'Кому понравилось', exact: true });
    await expect(authors).toBeVisible();
    const feed = (await (await response).json()) as { items: { authorName: string; authorTag?: string }[] };
    if (feed.items.length) {
        const author = feed.items[0];
        if (author.authorTag) {
            await expect(authors.getByRole('link', { name: author.authorName })).toHaveAttribute(
                'href',
                `/${author.authorTag}`,
            );
        } else {
            await expect(authors.getByText(author.authorName || 'Участник', { exact: true })).toBeVisible();
        }
    } else {
        await expect(authors.getByText('Здесь пока никого')).toBeVisible();
    }
    await authors.getByRole('button', { name: /Закрыть|Close/ }).click();
    await viewer.getByRole('button', { name: /Кому не понравилось:/ }).click();
    await expect(page.getByRole('dialog', { name: 'Кому не понравилось', exact: true })).toBeVisible();
});

test('keeps the account dimensions stable for dialogs and supports settings and the personal page', async ({
    page,
    context,
}) => {
    const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
        email: string;
        password: string;
    };
    await page.goto('http://localhost:3000/ru?returnTo=%2Fperson%2Fru%2Fkrel');
    await page.getByLabel('Электронная почта', { exact: true }).fill(account.email);
    await page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/krel$/);
    try {
        for (const caption of ['Мои сессии', 'Смена пароля', 'Смена почты', 'Уведомления']) {
            const trigger = page.getByRole('button', { name: 'Аккаунт: Крел' });
            const before = (await trigger.boundingBox())!;
            await trigger.click();
            await page.getByText(caption, { exact: true }).click();
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
            const after = (await trigger.boundingBox())!;
            expect(after.width).toBeCloseTo(before.width, 1);
            expect(after.height).toBeCloseTo(before.height, 1);
            await dialog.getByRole('button', { name: /Закрыть диалоговое окно|Close dialog/ }).click();
        }
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Моя страница', { exact: true }).click();
        await expect(page).toHaveURL(/\/krel$/);
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Язык', { exact: true }).hover();
        await page.getByText('English', { exact: true }).click();
        await expect(page.getByRole('tab', { name: 'Wall', exact: true })).toBeVisible();
        await expect(page).toHaveURL(/\/krel$/);
    } finally {
        const token = (await context.cookies()).find((c) => c.name === 'PERSONS_SESSION')?.value;
        if (token) {
            const sessions = (await (
                await page.request.get('http://localhost:8081/v1/sessions', {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ).json()) as { items: { id: string; current: boolean }[] };
            const current = sessions.items.find((s) => s.current);
            if (current) {
                await page.request.delete(`http://localhost:8081/v1/sessions/${current.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        }
    }
});
