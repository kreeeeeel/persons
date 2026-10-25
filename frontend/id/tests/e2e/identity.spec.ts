import { expect, test } from '@playwright/test';

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const viewport of [
            { width: 320, height: 568 },
            { width: 844, height: 390 },
            { width: 390, height: 844 },
            { width: 1440, height: 1000 },
        ]) {
            test(`${locale} ${theme} ${viewport.width}: readable sign-in, assets and navigation`, async ({
                page,
                context,
                baseURL,
            }) => {
                const errors: string[] = [];

                page.on('pageerror', (error) => errors.push(error.message));
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3000' },
                ]);
                await page.setViewportSize(viewport);
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.goto(`/${locale}`);
                const email = page.getByLabel(locale === 'ru' ? 'Электронная почта' : 'Email address', { exact: true });

                await expect(email).toBeVisible();
                await expect(
                    page.getByRole('link', {
                        name: locale === 'ru' ? 'Войти с помощью Яндекс ID' : 'Sign in with Yandex ID',
                    }),
                ).toBeVisible();
                await expect(
                    page.getByRole('heading', { name: locale === 'ru' ? 'Вход в ID' : 'Sign in to ID', exact: true }),
                ).toBeVisible();
                await expect(page.getByRole('separator')).toHaveCount(1);
                await expect(page.getByRole('banner')).toHaveCount(0);
                await expect(page.getByRole('contentinfo')).toHaveCount(0);
                await expect(page.getByRole('button', { name: /Оформление|Appearance|Язык|Language/ })).toHaveCount(0);
                await expect(page.locator('img[src="/media/friends-v1.webp"]')).toHaveCount(0);
                await page.evaluate(() => document.fonts.ready);
                await expect(page.locator('html')).toHaveClass(new RegExp(`g-root_theme_${theme}`));
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

                const smallText = await page.evaluate(() =>
                    [...document.querySelectorAll('body *')]
                        .filter(
                            (el) =>
                                el.children.length === 0 &&
                                el.textContent?.trim() &&
                                el.getBoundingClientRect().width > 0 &&
                                el.getBoundingClientRect().height > 0,
                        )
                        .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
                        .map((el) => el.textContent?.slice(0, 40)),
                );

                expect(smallText).toEqual([]);
                const logo = page.locator('img[src="/media/logo.svg?v=vadim-v1"]');

                await expect(logo).toHaveCount(1);
                const layout = await page.getByRole('main').evaluate((main) => {
                    const bounds = main.getBoundingClientRect();
                    const style = getComputedStyle(main);

                    return {
                        center: bounds.x + bounds.width / 2,
                        background: style.backgroundColor,
                        shadow: style.boxShadow,
                    };
                });

                expect(layout.center).toBeCloseTo(viewport.width / 2, 0);
                expect(layout.background).toBe('rgba(0, 0, 0, 0)');
                expect(layout.shadow).toBe('none');
                await expect
                    .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
                    .toBeGreaterThan(0);
                await page.screenshot({
                    path: `test-results/login-${locale}-${theme}-${viewport.width}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
                await page
                    .getByRole('button', {
                        name: locale === 'ru' ? 'Создать аккаунт' : 'Create an account',
                        exact: true,
                    })
                    .click();
                await expect(page.getByLabel(locale === 'ru' ? 'Имя' : 'First name', { exact: true })).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                expect(errors).toEqual([]);
            });
        }
    }
}

for (const locale of ['ru', 'en'] as const) {
    test(`${locale}: recovery keeps the clean authentication layout`, async ({ page }) => {
        await page.goto(`/${locale}`);
        await page.getByRole('link', { name: locale === 'ru' ? 'Забыли пароль?' : 'Forgot password?' }).click();

        await expect(page).toHaveURL(new RegExp(`/${locale}/recovery$`));
        await expect(
            page.getByRole('heading', { name: locale === 'ru' ? 'Восстановление пароля' : 'Password recovery' }),
        ).toBeVisible();
        await expect(page.getByRole('banner')).toHaveCount(0);
        await expect(page.getByRole('contentinfo')).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Оформление|Appearance|Язык|Language/ })).toHaveCount(0);
        await expect(
            page.getByLabel(locale === 'ru' ? 'Электронная почта' : 'Email address', { exact: true }),
        ).toBeVisible();
    });
}

test('unconfigured OAuth returns a clear error without losing the sign-in form', async ({ page }) => {
    test.skip(process.env.E2E_YANDEX_CONFIGURED === 'true', 'This case expects an unconfigured local provider');
    await page.goto('/api/oauth/yandex/start?locale=ru');
    await expect(page).toHaveURL(/oauthError=OAUTH_UNAVAILABLE/);
    await expect(page.getByText('Вход через Яндекс временно недоступен. Войдите по почте.')).toBeVisible();
    await expect(page.getByLabel('Электронная почта', { exact: true })).toBeVisible();
});
