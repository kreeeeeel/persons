import { expect, test } from '@playwright/test';

test('shows skeletons until scripts are ready and handles the first registration click', async ({ page }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/_next/static/chunks/*.js', async (route) => {
        await gate;
        await route.continue();
    });
    await page.goto('/ru', { waitUntil: 'commit' });
    await expect(page.getByRole('status', { name: 'Загрузка…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать аккаунт', exact: true })).toHaveCount(0);
    release();
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await expect(page.getByLabel('Имя', { exact: true })).toBeVisible();
});
