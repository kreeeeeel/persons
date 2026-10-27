import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test.skip(process.env.E2E_REAL_PROFILE !== 'true', 'Requires the isolated local API and review profiles');

test.beforeEach(async ({ context, baseURL }) => {
    const { token } = JSON.parse(await readFile(path.resolve('../../.cache/feature-session.json'), 'utf8'));
    await context.addCookies([
        { name: 'PERSONS_SESSION', value: token, url: baseURL ?? 'http://localhost:3002' },
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
});

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [390, 1440]) {
            test(`stacked dates and compact feed headers ${locale} ${theme} ${width}`, async ({
                page,
                context,
                baseURL,
            }) => {
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.setViewportSize({ width, height: 900 });
                await page.goto(`/${locale}/person/krel`);
                const sidebar = page.getByRole('complementary');
                const birth = await sidebar.locator('time[datetime="2001-05-14"]').locator('..').boundingBox();
                const departure = await sidebar.locator('time[datetime="2026-06-01"]').locator('..').boundingBox();
                expect(birth).not.toBeNull();
                expect(departure?.y).toBeGreaterThanOrEqual((birth?.y ?? 0) + (birth?.height ?? 0) + 7);
                expect(departure?.x).toBeCloseTo(birth?.x ?? 0, 0);
                expect(departure?.width).toBeCloseTo(birth?.width ?? 0, 0);
                await page.screenshot({ path: `test-results/layout-dates-${locale}-${theme}-${width}.png` });

                for (const route of ['feed', 'publications/krel']) {
                    await page.goto(`/${locale}/${route}`);
                    const card = page
                        .getByRole('article')
                        .filter({ has: page.locator('p') })
                        .first();
                    await expect(card).toBeVisible();
                    const author = card.getByRole('link').first();
                    await expect(author.locator('[title]').first()).toHaveCSS('font-size', '14px');
                    const avatar = await author.locator('[style*="--persons-avatar-size"]').boundingBox();
                    expect(avatar?.width).toBeCloseTo(30, 0);
                    const text = await card.locator('p').last().boundingBox();
                    const likes = await card
                        .getByRole('button', { name: locale === 'ru' ? /^Нравится/ : /^Like/ })
                        .first()
                        .boundingBox();
                    expect(likes?.y).toBeGreaterThanOrEqual((text?.y ?? 0) + (text?.height ?? 0) + 15);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                    await page.screenshot({
                        path: `test-results/layout-${route.replaceAll('/', '-')}-${locale}-${theme}-${width}.png`,
                    });
                }
            });
        }
    }
}

for (const width of [320, 390, 1440]) {
    test(`editor follows settings navigation layout ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/ru/person/krel');
        await page.getByRole('button', { name: 'Управление страницей', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Редактирование страницы', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Редактирование персоны' });
        if (width > 760) {
            await expect(editor.getByRole('group', { name: 'Информация о странице' })).toContainText('@krel');
            const army = editor.getByRole('menuitem', { name: 'Армия', exact: true });
            await army.click();
            await editor.getByRole('heading', { name: 'Армия', exact: true }).hover();
            await expect(army).toHaveAttribute('aria-current', 'page');
            await expect(army).toHaveCSS('border-radius', '10px');
            await expect(army).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
            for (const label of ['Страница', 'Статусы', 'Видимость и контакты']) {
                await expect(editor.getByText(label, { exact: true })).toBeVisible();
            }
        } else {
            await editor.getByRole('combobox', { name: 'Разделы', exact: true }).click();
            await page.getByRole('option', { name: 'Армия', exact: true }).click();
            await expect(editor.getByLabel('Дата ухода в армию', { exact: true })).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/layout-editor-${width}.png` });
    });
}
