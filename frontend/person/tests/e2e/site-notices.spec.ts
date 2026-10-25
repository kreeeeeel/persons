import { expect, test } from '@playwright/test';

(['ru', 'en'] as const).forEach((locale) => {
    (['light', 'dark'] as const).forEach((theme) => {
        test(`${locale} ${theme}: fixed glass ticker, responsive layout and reduced motion`, async ({
            page,
            context,
            baseURL,
        }) => {
            await context.addCookies([
                { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
            ]);
            await page.goto(`/${locale}`);

            const ticker = page.getByRole('region', {
                name: locale === 'ru' ? 'Информация о контенте сайта' : 'About the content on this site',
            });
            await expect(ticker).toBeVisible();
            await expect(ticker.getByRole('listitem')).toHaveCount(2);

            await ticker.evaluate((element) => {
                if (
                    getComputedStyle(element).borderTopWidth !== '0px' ||
                    !getComputedStyle(element).backdropFilter.includes('blur(24px)')
                ) {
                    throw new Error('The ticker must use borderless glass');
                }
                const item = element.querySelector('li');
                if (!item || !getComputedStyle(item, '::after').content.includes('•')) {
                    throw new Error('The ticker must use a solid bullet separator');
                }
            });

            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await expect
                .poll(() =>
                    ticker.locator('[class*="track"]').evaluate((element) => getComputedStyle(element).animationName),
                )
                .not.toBe('none');

            for (const reducedMotion of ['no-preference', 'reduce'] as const) {
                await page.emulateMedia({ reducedMotion });
                for (const viewport of [
                    { width: 320, height: 568 },
                    { width: 390, height: 844 },
                    { width: 844, height: 390 },
                    { width: 1440, height: 1000 },
                ]) {
                    await page.setViewportSize(viewport);
                    await expect
                        .poll(async () => {
                            const strip = await ticker.boundingBox();
                            const controls = await page
                                .getByRole('group', {
                                    name: locale === 'ru' ? 'Управление слайдами' : 'Slideshow controls',
                                })
                                .boundingBox();
                            return Boolean(
                                strip &&
                                controls &&
                                Math.abs(strip.y + strip.height - viewport.height) < 1 &&
                                controls.y + controls.height <= strip.y,
                            );
                        })
                        .toBe(true);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                }
            }

            expect(
                await ticker.locator('[class*="track"]').evaluate((element) => getComputedStyle(element).animationName),
            ).toBe('none');
        });
    });
});

test('does not render the ticker while page illustrations are loading', async ({ page }) => {
    await page.route('**/media/play-*', (route) => route.abort());
    await page.goto('/ru');
    await expect(page.getByRole('status', { name: 'Загрузка…', exact: true })).toBeVisible();
    await expect(page.locator('[data-view="glass"]')).toHaveCount(0);
});

test('does not render the ticker on a utility error page', async ({ page }) => {
    await page.goto('/ru/missing/utility/page');
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('[data-view="glass"]')).toHaveCount(0);
});
