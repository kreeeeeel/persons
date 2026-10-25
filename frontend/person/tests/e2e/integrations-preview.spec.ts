import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_MOCK_PREVIEW !== 'true', 'Requires scripts/start-community-preview.ps1');

test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
});

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [320, 390, 1440]) {
            test(`match preview: ${locale}, ${theme}, ${width}`, async ({ page, context, baseURL }) => {
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.setViewportSize({ width, height: width === 1440 ? 768 : 1100 });
                await page.emulateMedia({ reducedMotion: 'reduce' });
                const errors: string[] = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await page.goto(`/${locale}/person/krel?preview=integrations`);
                const tab = page.getByRole('tab', { name: locale === 'ru' ? 'Игры' : 'Games', exact: true });
                await expect(tab).toHaveAttribute('aria-selected', 'true');
                await expect
                    .poll(async () =>
                        tab.evaluate((element) => {
                            const container = element.closest('[role="tablist"]')?.parentElement;
                            if (!container) {
                                return false;
                            }
                            const bounds = element.getBoundingClientRect();
                            const parent = container.getBoundingClientRect();
                            return bounds.left >= parent.left && bounds.right <= parent.right;
                        }),
                    )
                    .toBe(true);
                const card = page.getByRole('button', { name: /Juggernaut/ });
                await card.scrollIntoViewIfNeeded();
                await expect(card).toBeVisible();
                await expect(card.locator('img[src$="/ranks/rank-5.png"]')).toBeVisible();
                await expect(card.locator('img[src$="/ranks/stars-4.png"]')).toBeVisible();
                await expect
                    .poll(() =>
                        card
                            .locator('img')
                            .evaluateAll((images) =>
                                images.every(
                                    (image) =>
                                        image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
                                ),
                            ),
                    )
                    .toBe(true);
                await page.evaluate(() => document.fonts.ready);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.screenshot({ path: `test-results/integrations-${locale}-${theme}-${width}.png` });
                if (locale === 'ru' && theme === 'light' && width === 1440) {
                    await page.getByRole('tabpanel', { name: 'Игры', exact: true }).screenshot({
                        path: 'test-results/dotabuff-design-preview.png',
                    });
                }
                await card.click();
                const dialog = page.getByRole('dialog');
                await expect(dialog).toBeVisible();
                await expect(dialog.getByText('42:18', { exact: true })).toBeVisible();
                await expect(dialog.getByRole('img', { name: 'Battle Fury', exact: true })).toBeVisible();
                await expect(dialog.getByRole('img', { name: 'Telescope', exact: true })).toBeVisible();
                await expect(dialog.getByText(locale === 'ru' ? '15 м' : '15 m', { exact: true })).toBeVisible();
                await expect(dialog.getByText('HD', { exact: true })).toBeVisible();
                await expect(dialog.getByText('TD', { exact: true })).toBeVisible();
                await expect(dialog.getByText(locale === 'ru' ? 'Нейтралка' : 'Neutral')).toHaveCount(0);
                await expect(dialog.getByRole('link', { name: /OpenDota/ })).toHaveAttribute('target', '_blank');
                await expect(
                    dialog.getByRole('button', { name: locale === 'ru' ? 'Поделиться' : 'Share', exact: true }),
                ).toHaveCount(0);
                await expect
                    .poll(() =>
                        dialog
                            .locator('img')
                            .evaluateAll((images) =>
                                images.every(
                                    (image) =>
                                        image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
                                ),
                            ),
                    )
                    .toBe(true);
                expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
                if (width === 1440) {
                    expect(
                        await dialog
                            .locator('.g-dialog')
                            .evaluate((element) => element.scrollHeight <= element.clientHeight),
                    ).toBe(true);
                }
                await page.screenshot({ path: `test-results/integration-match-${locale}-${theme}-${width}.png` });
                await page.keyboard.press('Escape');
                await expect(dialog).toHaveCount(0);
                await expect(card).toBeFocused();
                await page.getByRole('button', { name: /Pudge/ }).click();
                await expect(
                    page.getByRole('dialog').getByText(locale === 'ru' ? 'Поражение' : 'Defeat', { exact: true }),
                ).toBeVisible();
                expect(errors).toEqual([]);
            });
        }
    }
}
