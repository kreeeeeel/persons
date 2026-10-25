import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
    for (const viewport of [
        { width: 1280, height: 800, minimumHeadingSize: 60, wordmarkSize: '28px' },
        { width: 390, height: 844, minimumHeadingSize: 30, wordmarkSize: '22px' },
    ]) {
        test(`preserves branded typography in ${theme} at ${viewport.width}px`, async ({ page, context, baseURL }) => {
            await context.addCookies([
                { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
            ]);
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto('/ru');

            const heading = page.getByRole('heading', { level: 1 });
            await expect(heading).toBeVisible();
            await page.evaluate(() => document.fonts.ready);
            await expect(heading).toHaveCSS('font-weight', '750');
            await expect(heading).toHaveCSS('font-family', /personsFont/);
            expect(
                await heading.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
            ).toBeGreaterThan(viewport.minimumHeadingSize);
            await expect(page.getByRole('banner').getByText('Те ещё люди.', { exact: true })).toHaveCSS(
                'font-size',
                viewport.wordmarkSize,
            );
            await expect(page.locator('body')).toHaveCSS('font-size', '18px');
            await expect(page.getByRole('combobox')).toHaveCSS('font-family', /personsFont/);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        });
    }
}
