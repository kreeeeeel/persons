import { expect, test } from '@playwright/test';

test('rounds search matches and keeps only the expanding verified badge on hover', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('combobox').fill('krel');
    const match = page.getByRole('option', { name: /@krel/ });
    await expect(match).toBeVisible();
    await expect(match).toHaveCSS('border-radius', '16px');
    await match.hover();
    await expect(match).toHaveCSS('border-radius', '16px');
    await page.screenshot({ path: 'test-results/search-rounded-result.png' });
    await match.click();
    await expect(page).toHaveURL(/\/krel$/);
    const verified = page.getByRole('button', { name: 'Эта страница официально подтверждена' });
    await expect(verified).toBeVisible();
    expect(await verified.getAttribute('title')).toBeNull();
    await expect(verified.locator('[title], title')).toHaveCount(0);
    const collapsed = await verified.evaluate((element) => element.getBoundingClientRect().width);
    await verified.hover();
    await expect
        .poll(() => verified.evaluate((element) => element.getBoundingClientRect().width))
        .toBeGreaterThan(collapsed + 60);
    await expect(verified.getByText('Подтверждённая страница')).toHaveCSS('opacity', '1');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/verified-expanded.png' });
});

test.describe('touch reaction lists', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

    test('keeps a media voter dropdown open after touch activation without overflowing the screen', async ({
        page,
    }) => {
        await page.goto('/krel');
        await page.getByRole('tab', { name: /Фотографии/ }).tap();
        await page.getByRole('button', { name: 'Тот самый человек из нашей компании', exact: true }).tap();
        const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
        await viewer
            .getByRole('button', { name: /Кому понравилось:/ })
            .first()
            .tap();
        const voters = page.getByRole('dialog', { name: 'Кому понравилось', exact: true });
        await expect(voters).toBeVisible();
        await voters.tap();
        await page.waitForTimeout(400);
        await expect(voters).toBeVisible();
        const bounds = await voters.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, viewport: innerWidth };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
        await page.screenshot({ path: 'test-results/media-voters-touch.png' });
    });
});
