import { expect, test } from '@playwright/test';
import { slides } from '@/modules/landing/model/slides';

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const viewport of [
            { width: 320, height: 568 },
            { width: 390, height: 844 },
            { width: 844, height: 390 },
            { width: 1440, height: 1000 },
        ]) {
            test(`${locale} ${theme} ${viewport.width}: viewport, art, search and sign-in destination`, async ({
                page,
                context,
                baseURL,
            }) => {
                const errors: string[] = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.setViewportSize(viewport);
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.route('**/api/person/v1/persons/search?**', (route) =>
                    route.fulfill({ json: { items: [], total: 0, page: 0, size: 8 } }),
                );
                await page.goto(`/${locale}`);
                await expect(
                    page.getByRole('heading', { name: locale === 'ru' ? /Свои люди/ : /Your people/ }),
                ).toBeVisible();
                await page.evaluate(() => document.fonts.ready);
                await expect
                    .poll(() =>
                        page
                            .locator('img[src^="/media/play-"]')
                            .evaluateAll((images) =>
                                images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
                            ),
                    )
                    .toBe(true);
                const login = page.getByRole('link', { name: locale === 'ru' ? 'Войти' : 'Sign in', exact: true });
                await expect(login).toHaveAttribute(
                    'href',
                    `http://localhost:3000/${locale}?returnTo=%2Fperson%2F${locale}`,
                );
                expect(await page.getByRole('banner').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
                    'rgba(0, 0, 0, 0)',
                );
                const canvas = await page.getByRole('main').boundingBox();
                expect(canvas?.y).toBe(0);
                expect(canvas?.height).toBe(viewport.height);
                const controls = page.getByRole('group', {
                    name: locale === 'ru' ? 'Управление слайдами' : 'Slideshow controls',
                });
                expect(await controls.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
                const controlsBounds = await controls.boundingBox();
                expect(controlsBounds).not.toBeNull();
                expect(Math.abs(controlsBounds!.x + controlsBounds!.width / 2 - viewport.width / 2)).toBeLessThan(1);
                expect(controlsBounds!.x).toBeGreaterThanOrEqual(0);
                expect(controlsBounds!.x + controlsBounds!.width).toBeLessThanOrEqual(viewport.width);
                expect(
                    await page.evaluate(() => ({
                        width: document.documentElement.scrollWidth <= innerWidth,
                        height: document.documentElement.scrollHeight <= innerHeight,
                    })),
                ).toEqual({ width: true, height: true });
                const input = page.getByRole('combobox');
                const field = await page.locator('label[for="friend-search"]').boundingBox();
                expect(field?.height).toBeGreaterThanOrEqual(60);
                await input.fill('Вадим');
                expect(
                    await page
                        .locator('label[for="friend-search"]')
                        .evaluate((el) => getComputedStyle(el).outlineStyle),
                ).toBe('none');
                expect(
                    await input.evaluate((el) => ({
                        border: getComputedStyle(el.parentElement!).borderTopWidth,
                        outline: getComputedStyle(el.parentElement!).outlineColor,
                    })),
                ).toEqual({ border: '0px', outline: 'rgba(0, 0, 0, 0)' });
                await input.press('Enter');
                await expect(input).toHaveValue('Вадим');
                await expect(page).toHaveURL(new RegExp(`/${locale}$`));
                await input.press('Escape');
                for (let index = 0; index < slides.length; index += 1) {
                    await controls
                        .getByRole('button', {
                            name:
                                locale === 'ru'
                                    ? `Иллюстрация ${index + 1} из ${slides.length}`
                                    : `Illustration ${index + 1} of ${slides.length}`,
                            exact: true,
                        })
                        .click();
                    await expect(page.getByRole('heading')).toBeVisible();
                    expect(
                        await page.getByRole('heading').evaluate((el) => {
                            const bounds = el.getBoundingClientRect();
                            const lines = [...(el.firstElementChild?.children ?? [])];

                            return {
                                lines: lines.length,
                                fits: lines.every((line) => line.getBoundingClientRect().right <= bounds.right),
                            };
                        }),
                    ).toEqual({ lines: 2, fits: true });
                }
                const illustration = await page.locator(`img[src="${slides[1].src}"]`).boundingBox();
                expect(illustration!.x + illustration!.width).toBeLessThanOrEqual(viewport.width + 1);
                expect(
                    await page.evaluate(() =>
                        [...document.querySelectorAll('body *')]
                            .filter(
                                (el) =>
                                    el.children.length === 0 &&
                                    el.textContent?.trim() &&
                                    el.getBoundingClientRect().width > 0 &&
                                    Number.parseFloat(getComputedStyle(el).fontSize) < 16,
                            )
                            .map((el) => el.textContent),
                    ),
                ).toEqual([]);
                await page.screenshot({
                    path: `test-results/person-${locale}-${theme}-${viewport.width}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
                expect(errors).toEqual([]);
            });
        }
    }
}

test('keeps the caller destination through password recovery and OAuth errors', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('link', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/returnTo=%2Fperson%2Fru/);
    await page.getByRole('link', { name: 'Забыли пароль?' }).click();
    await expect(page).toHaveURL(/recovery\?returnTo=%2Fperson%2Fru/);
    await page.getByRole('button', { name: 'У меня уже есть аккаунт' }).click();
    await page.getByRole('link', { name: 'Войти с помощью Яндекс ID' }).click();
    await expect(page).toHaveURL(/oauthError=OAUTH_UNAVAILABLE.*returnTo=%2Fperson%2Fru/);
    await expect(page.getByRole('heading', { name: 'Вход в ID' })).toBeVisible();
});

test('keeps every typed headline within two lines and places playback before the dots', async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/ru');
    await page.evaluate(() => document.fonts.ready);
    const controls = page.getByRole('group', { name: 'Управление слайдами' });
    await expect(controls.getByRole('button').first()).toHaveAccessibleName('Остановить слайд-шоу');
    await controls.getByRole('button').first().click();

    for (const viewport of [
        { width: 320, height: 568 },
        { width: 1024, height: 768 },
    ]) {
        await page.setViewportSize(viewport);

        for (let index = 0; index < slides.length; index += 1) {
            await controls
                .getByRole('button', { name: `Иллюстрация ${index + 1} из ${slides.length}`, exact: true })
                .click();
            const fitsWhileTyping = await page.evaluate(async () => {
                const deadline = performance.now() + 1600;

                return new Promise<boolean>((resolve) => {
                    function sample() {
                        const heading = document.querySelector('h1');

                        if (heading) {
                            const bounds = heading.getBoundingClientRect();
                            const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
                            const lines = [...(heading.firstElementChild?.children ?? [])];

                            if (
                                lines.length !== 2 ||
                                bounds.height > lineHeight * 2.1 ||
                                lines.some((line) => line.getBoundingClientRect().right > bounds.right)
                            ) {
                                resolve(false);
                                return;
                            }
                        }

                        if (performance.now() >= deadline) {
                            resolve(true);
                            return;
                        }

                        requestAnimationFrame(sample);
                    }

                    sample();
                });
            });
            expect(fitsWhileTyping).toBe(true);
        }
    }
});
