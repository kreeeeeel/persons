import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
});

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
                    await expect(page.getByRole('heading', { level: 1 }).locator('..')).toHaveCSS('opacity', '1');
                    await expect
                        .poll(async () => {
                            const strip = await ticker.boundingBox();
                            const controls = await page
                                .getByRole('group', {
                                    name: locale === 'ru' ? 'Управление слайдами' : 'Slideshow controls',
                                })
                                .boundingBox();
                            const search = await page.getByRole('combobox').boundingBox();
                            return Boolean(
                                strip &&
                                controls &&
                                search &&
                                strip.height <= 48 &&
                                Math.abs(strip.y + strip.height - viewport.height) < 1 &&
                                controls.y + controls.height <= strip.y &&
                                (controls.y >= search.y + search.height || controls.x >= search.x + search.width),
                            );
                        })
                        .toBe(true);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                    const rows = await ticker
                        .getByRole('listitem')
                        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
                    expect(rows[0]).toBeCloseTo(rows[1], 0);
                    if (viewport.width < 400) {
                        await page.screenshot({
                            path: `test-results/mobile-ticker-${locale}-${theme}-${viewport.width}-${reducedMotion}.png`,
                            animations: 'disabled',
                        });
                    }
                }
            }

            expect(
                await ticker.locator('[class*="track"]').evaluate((element) => getComputedStyle(element).animationName),
            ).toBe('none');
        });
    });
});

test('does not render the ticker while page illustrations are loading', async ({ page }) => {
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/media/play-*', async (route) => {
        await pending;
        await route.abort();
    });
    try {
        await page.goto('/ru', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('status', { name: 'Загрузка…', exact: true })).toBeVisible();
        await expect(page.locator('[data-view="glass"]')).toBeHidden();
    } finally {
        release();
    }
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.locator('[data-view="glass"]')).toBeVisible();
});

test('does not render the ticker on a utility error page', async ({ page }) => {
    await page.goto('/ru/missing/utility/page');
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('[data-view="glass"]')).toHaveCount(0);
});
