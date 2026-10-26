import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test.skip(process.env.E2E_REAL_PROFILE !== 'true', 'Requires the real local API stack and seeded review profiles');

test.beforeEach(async ({ context, baseURL, page }) => {
    const session = JSON.parse(await readFile(path.resolve('../../.cache/feature-session.json'), 'utf8'));
    await context.addCookies([
        { name: 'PERSONS_SESSION', value: session.token, url: baseURL ?? 'http://localhost:3002' },
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [320, 390, 768, 1440]) {
            test(`profile layout ${locale} ${theme} ${width}`, async ({ page, context, baseURL }) => {
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
                const errors: string[] = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await page.goto(`/${locale}/person/krel`);
                const sidebar = page.getByRole('complementary', {
                    name: locale === 'ru' ? 'Информация о человеке' : 'Person information',
                });
                await expect(sidebar.locator('time[datetime="2001-05-14"]')).toBeVisible();
                await expect(sidebar.getByRole('progressbar')).toBeVisible();
                await expect(
                    page.getByRole('tab', { name: locale === 'ru' ? /^Фото и моменты/ : /^Photos and moments/ }),
                ).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const identity = await sidebar.boundingBox();
                const description = await page.getByText(/^Большое описание человека/).boundingBox();
                if (width > 1100) {
                    expect(description?.x).toBeGreaterThan((identity?.x ?? 0) + (identity?.width ?? 0));
                    expect((identity?.y ?? 0) + (identity?.height ?? 0)).toBeLessThan(880);
                    await page.evaluate(() => window.scrollTo(0, 300));
                    expect((await sidebar.boundingBox())?.y).toBeCloseTo(identity?.y ?? 0, 0);
                } else {
                    expect(description?.y).toBeGreaterThan((identity?.y ?? 0) + (identity?.height ?? 0));
                }
                if (width <= 700) {
                    const menu = page.getByRole('button', { name: locale === 'ru' ? 'Открыть меню' : 'Open menu' });
                    await menu.click();
                    const drawer = page.getByRole('dialog', { name: locale === 'ru' ? 'Меню' : 'Menu' });
                    await expect(
                        drawer.getByRole('link', { name: locale === 'ru' ? 'Люди' : 'People', exact: true }),
                    ).toBeVisible();
                    await page.keyboard.press('Escape');
                    await expect(drawer).toHaveCount(0);
                }
                await page.screenshot({
                    path: `test-results/profile-real-${locale}-${theme}-${width}.png`,
                    fullPage: width < 1100,
                });
                expect(errors).toEqual([]);
            });
        }
    }
}

test('uses real service dates and hides the return notice after seven days', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [tag, title] of [
        ['vadim', 'до призыва'],
        ['tyamik', 'Уже дома'],
        ['artem', 'Уже дома'],
    ] as const) {
        await page.goto(`/ru/person/${tag}`);
        await expect(page.getByRole('region', { name: title, exact: true })).toBeVisible();
    }
    await page.goto('/ru/person/evgeny');
    await expect(page.getByRole('complementary').getByRole('region')).toHaveCount(0);
    await expect(page.getByText('Ушёл в армию', { exact: true })).toBeVisible();
    await page.goto('/ru/person/slava');
    await expect(page.getByRole('complementary').getByRole('region')).toHaveCount(0);
    await expect(page.getByRole('complementary').locator('time')).toHaveCount(1);
});

for (const width of [320, 390]) {
    test(`mobile landing places art above content and keeps header usable ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 740 });
        await page.goto('/ru');
        const search = page.getByRole('combobox');
        await expect(search).toBeVisible();
        const activeImage = page.locator('img[fetchpriority="high"]').first();
        await expect(activeImage).toBeVisible();
        const artwork = await activeImage.boundingBox();
        const searchBox = await search.boundingBox();
        expect(artwork?.y).toBeGreaterThanOrEqual(72);
        expect((artwork?.y ?? 0) + (artwork?.height ?? 0)).toBeLessThan(searchBox?.y ?? 0);
        expect(searchBox?.y).toBeLessThan(650);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/landing-mobile-real-${width}.png`, fullPage: true });
    });
}

test('mixed gallery preserves original dialogs and navigates across kinds with view badges on previews', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ru/person/krel');
    await page.getByRole('tab', { name: /^Фото и моменты/ }).click();
    const panel = page.getByRole('tabpanel', { name: 'Фото и моменты' });
    const profiles = JSON.parse(await readFile(path.resolve('../../.cache/feature-profiles.json'), 'utf8'));
    const galleryUrl = `/api/person/v1/persons/${profiles.krel}/gallery?size=12`;
    const firstPage = await (await page.request.get(galleryUrl)).json();
    const item = firstPage.items.find((item: { kind: string }) => item.kind === 'MOMENT');
    const video = panel.getByRole('button', { name: item.title, exact: true });
    const detail = await (await page.request.get(`/api/person/v1/media/${item.id}/details?mixed=true`)).json();
    expect(detail.nextMediaKind).toBe('PHOTO');
    await expect(video).toBeVisible();
    const badge = video.getByLabel(/просмотр/i);
    const previewBox = await video.boundingBox();
    const badgeBox = await badge.boundingBox();
    expect(badgeBox?.x).toBeGreaterThan((previewBox?.x ?? 0) + (previewBox?.width ?? 0) / 2);
    expect(badgeBox?.y).toBeLessThan((previewBox?.y ?? 0) + 30);
    await video.click();
    const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await expect(dialog.locator('video')).toBeVisible();
    await expect(dialog.getByRole('region', { name: 'Комментарии', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Нравится', exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/gallery-real-video.png' });
    await dialog.getByRole('button', { name: 'Следующее медиа' }).click();
    await expect(page).toHaveURL(new RegExp(`photo=${detail.nextMediaId}`));
    await expect(dialog.locator('video')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/gallery-real-photo.png' });
    await page.keyboard.press('Escape');
    await expect(panel.getByRole('navigation', { name: 'Страницы галереи' })).toHaveCount(0);
    const secondPage = await (await page.request.get(`${galleryUrl}&page=1`)).json();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(panel.getByRole('button', { name: secondPage.items[0].title, exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: item.title, exact: true })).toBeVisible();
});

test('uploads mixed files through one picker and selects the original preview by file', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ru/person/krel');
    await page.getByRole('tab', { name: /^Фото и моменты/ }).click();
    const panel = page.getByRole('tabpanel', { name: 'Фото и моменты' });
    await panel.getByRole('button', { name: 'Загрузить', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    const picker = page.getByRole('dialog').getByLabel('Выбрать файл', { exact: true });
    await expect(picker).toHaveAttribute('accept', /image\/jpeg.*video\/mp4/);
    await picker.setInputFiles([
        path.resolve('../assets/achievements/military-duty-v1.png'),
        path.resolve('.cache/feed/moment.webm'),
    ]);
    await expect(page.getByText('Предпросмотр фотографии', { exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '2', exact: true }).click();
    await expect(page.getByText('Предпросмотр видео', { exact: true })).toBeVisible();
    const caption = `Проверка загрузки ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Подпись', exact: true }).fill(caption);
    await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
    await expect(panel.getByRole('button', { name: caption, exact: true })).toBeVisible({ timeout: 30000 });
    await panel.getByRole('button', { name: caption, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await expect(dialog.locator('video')).toBeVisible();
    await dialog
        .getByRole('textbox', { name: 'Ваш комментарий', exact: true })
        .fill('Проверка комментария после загрузки');
    await dialog.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(dialog.getByText('Проверка комментария после загрузки', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/gallery-real-mobile-comments.png' });
});

test('CMS gallery appends the next page on scroll and retains loaded media', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3001/ru/persons/krel');
    await page.getByRole('tab', { name: /^Фото и моменты/ }).click();
    const panel = page.getByRole('main');
    const profiles = JSON.parse(await readFile(path.resolve('../../.cache/feature-profiles.json'), 'utf8'));
    const url = `http://localhost:3001/api/person/v1/persons/${profiles.krel}/gallery?size=12`;
    const first = await (await page.request.get(url)).json();
    const next = await (await page.request.get(`${url}&page=1`)).json();
    await expect(panel.getByRole('button', { name: first.items[0].title, exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(panel.getByRole('button', { name: next.items[0].title, exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: first.items[0].title, exact: true })).toBeVisible();
    await expect(panel.getByRole('navigation')).toHaveCount(0);
});

test('edits calendar dates in the CMS and publishes them through the API', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3001/ru/persons/slava');
    await page.getByRole('button', { name: 'Управление страницей', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Редактирование страницы', exact: true }).click();
    const editor = page.getByRole('dialog');
    await editor.getByLabel('Дата рождения', { exact: true }).fill('2000-01-02');
    await editor.getByLabel('Дата ухода в армию', { exact: true }).fill('2027-06-01');
    await editor.getByLabel('Дата возвращения из армии', { exact: true }).fill('2028-06-01');
    await editor.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.goto('/ru/person/slava');
    await expect(page.getByRole('complementary').locator('time[datetime="2000-01-02"]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'до призыва', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Управление страницей', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Редактирование страницы', exact: true }).click();
    const dates = page.getByRole('dialog');
    await dates.getByLabel('Дата ухода в армию', { exact: true }).fill('');
    await dates.getByLabel('Дата возвращения из армии', { exact: true }).fill('');
    await dates.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(dates).toHaveCount(0);
    await expect(page.getByRole('complementary').getByRole('region')).toHaveCount(0);
});
