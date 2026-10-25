import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_MOCK_PREVIEW !== 'true', 'Requires scripts/start-community-preview.ps1');

test.beforeEach(async ({ context, baseURL }) => {
    const url = baseURL ?? 'http://localhost:3002';
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url },
        { name: 'PERSONS_SESSION', value: 'local-community-preview', url },
    ]);
});

test('game events have a spaced page header and reuse the match dialog', async ({ page }) => {
    await page.goto('/ru/feed');
    await page.getByRole('combobox', { name: 'События в ленте' }).click();
    await page.getByRole('option', { name: 'Игры', exact: true }).click();
    const game = page.locator('article[data-kind="game"]').first();
    await expect(game.getByText('сыграл матч в', { exact: false })).toBeVisible();
    await expect(game.getByText('Dota2')).toBeVisible();
    await expect(game.locator('time')).toHaveAttribute('datetime', '2026-10-22T13:42:00.000Z');
    const card = game.getByRole('button', { name: /Juggernaut/ });
    const avatar = await game.locator('[style*="--persons-avatar-size"]').boundingBox();
    const cardBounds = await card.boundingBox();
    const headerGap = cardBounds!.y - (avatar!.y + avatar!.height);
    expect(headerGap).toBeGreaterThanOrEqual(13);
    expect(headerGap).toBeLessThanOrEqual(14);
    const before = await page.locator('main').boundingBox();
    await card.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img', { name: 'Telescope' })).toBeVisible();
    const after = await page.locator('main').boundingBox();
    expect(after!.x).toBe(before!.x);
    expect(after!.width).toBe(before!.width);
    await page.keyboard.press('Escape');
    await expect(card).toBeFocused();
    await page.goto('/ru');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Лента', exact: true })).toBeVisible();
});

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [390, 1440]) {
            test(`feed layout: ${locale}, ${theme}, ${width}`, async ({ page, context, baseURL }) => {
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.setViewportSize({ width, height: 1000 });
                await page.emulateMedia({ reducedMotion: 'reduce' });
                const failures: string[] = [];
                page.on('pageerror', (error) => failures.push(error.message));
                await page.goto(`/${locale}/feed`);
                await expect(
                    page.getByRole('heading', { level: 1, name: locale === 'ru' ? 'Лента' : 'Feed', exact: true }),
                ).toBeVisible();
                await expect(page.getByRole('article')).toHaveCount(6);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await expect(page.getByRole('article')).toHaveCount(10);
                await page.evaluate(() => window.scrollTo(0, 0));
                for (const kind of ['wall', 'photo', 'rating', 'achievement', 'moment', 'loan']) {
                    await expect(page.locator(`article[data-kind="${kind}"]`)).toHaveCount(1);
                }
                await expect(page.locator('article[data-kind="game"]')).toHaveCount(4);
                await expect(page.getByRole('article').locator('time')).toHaveCount(10);
                for (const kind of ['wall', 'photo', 'rating', 'moment', 'loan']) {
                    const card = page.locator(`article[data-kind="${kind}"]`);
                    await expect(card.getByText(locale === 'ru' ? 'на' : 'on', { exact: true })).toBeVisible();
                    await expect(card.locator('a')).toHaveCount(2);
                    const avatars = await card
                        .locator('[style*="--persons-avatar-size"]')
                        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
                    expect(avatars).toEqual([44, 44]);
                    await expect(card.getByText(locale === 'ru' ? 'на' : 'on', { exact: true })).toHaveCSS(
                        'font-size',
                        '20px',
                    );
                }
                const achievement = page.locator('article[data-kind="achievement"]');
                const achievementArt = await achievement.locator('img').boundingBox();
                const achievementTime = await achievement.locator('time').boundingBox();
                expect(achievementTime!.y).toBeGreaterThanOrEqual(achievementArt!.y + achievementArt!.height);
                for (const kind of ['photo', 'moment']) {
                    const card = page.locator(`article[data-kind="${kind}"]`);
                    const views = card.getByLabel(/^(Просмотры|Views):/);
                    const comments = card.getByLabel(/^(Комментарии|Comments):/);
                    await expect(views).toHaveCount(1);
                    await expect(comments).toHaveCount(1);
                    const preview = await card.getByRole('button').first().boundingBox();
                    expect((await views.boundingBox())!.y).toBeLessThan(preview!.y);
                    expect((await comments.boundingBox())!.y).toBeLessThan(preview!.y);
                    expect(await comments.evaluate((element) => !!element.closest('button, a, [role="button"]'))).toBe(
                        false,
                    );
                    await comments.click();
                    await expect(page.getByRole('dialog')).toHaveCount(0);
                }
                const dates = await page
                    .getByRole('article')
                    .evaluateAll((items) => items.map((item) => item.getAttribute('data-created-at')!));
                expect(dates).toEqual([...dates].sort().reverse());
                const sidebar = page.getByRole('complementary');
                if (width > 900) {
                    await expect(sidebar.getByRole('navigation')).toHaveCount(0);
                    await expect(sidebar.locator('a[href*="/person/"]')).toHaveCount(5);
                    await expect(sidebar.locator('a[href$="/people"], a[href$="/feed"]')).toHaveCount(0);
                    await page.evaluate(() => window.scrollTo(0, 700));
                    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.y ?? 0)).toBe(120);
                    await page.evaluate(() => window.scrollTo(0, 0));
                } else {
                    await expect(sidebar).toBeHidden();
                    expect((await page.getByRole('heading', { level: 1 }).boundingBox())?.y).toBeLessThan(250);
                }
                await expect(page.getByText(/2\s?500|Кому:|Займ открыт/)).toHaveCount(0);
                await expect(page.locator('article[data-kind="photo"] button img')).toHaveCount(1);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.screenshot({ path: `test-results/feed-${locale}-${theme}-${width}.png` });
                expect(failures).toEqual([]);
            });
        }
    }
}

test('uses original loan records and content reactions, shared media modal and page comments', async ({ page }) => {
    await page.goto('/ru/feed');
    const wall = page.locator('article[data-kind="wall"]');
    await wall.getByRole('button', { name: 'Не нравится', exact: true }).click();
    await expect(wall.getByRole('button', { name: 'Убрать дизлайк', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const credit = page.locator('article[data-kind="loan"]');
    await expect(credit).toContainText('Возвращает в срок');
    await expect(credit).toContainText('Вернул займ вовремя, без напоминаний.');
    const photo = page.locator('article[data-kind="photo"]');
    await photo.locator('button').first().click();
    const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await expect(viewer).toBeVisible();
    await viewer.getByRole('button', { name: 'Нравится', exact: true }).first().click();
    await expect(viewer.getByRole('button', { name: 'Нравится', exact: true }).first()).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    await viewer.getByRole('textbox').fill('Комментарий из общей ленты');
    await viewer.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(viewer.getByText('Комментарий из общей ленты', { exact: true })).toBeVisible();
    const source = await viewer.locator('img[src*="/content"]').getAttribute('src');
    const mediaId = source?.match(/\/media\/([^/]+)\/content/)?.[1];
    expect(mediaId).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0);
    await page.goto(`/ru/person/krel?photo=${mediaId}`);
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText('Комментарий из общей ленты', { exact: true })).toBeVisible();
    await expect(viewer.getByRole('button', { name: 'Нравится', exact: true }).first()).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /Займы/ }).click();
    await expect(page.getByText('Вернул займ вовремя, без напоминаний.', { exact: true })).toBeVisible();
});

test('opens moments in the existing media viewer and plays video', async ({ page }) => {
    await page.goto('/ru/feed');
    await page.locator('article[data-kind="moment"]').locator('button').first().click();
    const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await expect(viewer).toBeVisible();
    await viewer.getByRole('button', { name: 'Смотреть', exact: true }).first().click();
    await expect
        .poll(() =>
            viewer
                .locator('video')
                .evaluate((video) => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0),
        )
        .toBe(true);
});

test('publishes to a chosen page, creates individual photos and preserves them after reload', async ({ page }) => {
    const sample = Date.now();
    const wallText = `Запись на стене Вадима · ${sample}`;
    const photoText = `Отдельная фотография Вадима · ${sample}`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ru/feed');
    const composer = page.getByRole('region', { name: 'Что у вас нового?' });
    await composer.getByRole('button', { name: 'Где опубликовать', exact: true }).click();
    const target = page.getByRole('dialog', { name: 'Где опубликовать' });
    const ownPage = target.getByRole('button', { name: 'Крел', exact: true });
    await expect(ownPage).toHaveAttribute('aria-pressed', 'true');
    await expect(ownPage).toHaveCSS('height', '52px');
    await expect
        .poll(() =>
            ownPage.evaluate((row) => {
                const avatar = row.querySelector('[style*="--persons-avatar-size"]')!;
                return Math.round(avatar.getBoundingClientRect().x - row.getBoundingClientRect().x);
            }),
        )
        .toBe(12);
    await expect(target.getByRole('radio')).toHaveCount(0);
    await expect(target.getByRole('heading', { name: 'Найдите страницу' })).toBeVisible();
    const searchArt = target.getByRole('img', { name: 'Стёпа ищет страницу с лупой' });
    await expect(searchArt).toHaveAttribute('src', '/media/search-pages-stepa-v1.webp');
    await expect(searchArt).toBeVisible();
    await page.screenshot({ path: 'test-results/feed-publication-target-mobile.png', animations: 'disabled' });
    await target.getByRole('searchbox').fill('vadim');
    await expect(target.getByRole('button', { name: 'Вадим', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/feed-publication-search-mobile.png', animations: 'disabled' });
    await target.getByRole('button', { name: 'Вадим', exact: true }).click();
    await expect(target).toHaveCount(0);
    await expect(composer.getByRole('button', { name: 'Где опубликовать', exact: true })).toContainText('Вадим');
    await composer.getByRole('textbox').fill(wallText);
    await composer.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(page.getByRole('article').first()).toContainText(wallText);
    await expect(page.getByRole('article').first()).toContainText('Вадим');
    await composer.getByRole('textbox').fill(photoText);
    await composer.getByRole('button', { name: 'Загрузить файлы', exact: true }).click();
    await page
        .getByRole('dialog')
        .locator('input[type="file"]')
        .setInputFiles({
            name: 'photo.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8XQAAAAASUVORK5CYII=',
                'base64',
            ),
        });
    await composer.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(page.locator('article[data-kind="photo"]').filter({ hasText: photoText })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('article').first()).toContainText(photoText);
    await page.goto('/ru/person/vadim');
    await expect(page.getByText(wallText, { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Фото/ }).click();
    await expect(page.getByText(photoText, { exact: true })).toBeVisible();
});

test('uses the shared upload queue for a single moment', async ({ page }) => {
    await page.goto('/ru/feed');
    const composer = page.getByRole('region', { name: 'Что у вас нового?' });
    await composer.getByRole('textbox').fill('Отдельный момент из ленты');
    await composer.getByRole('button', { name: 'Загрузить файлы', exact: true }).click();
    await page
        .getByRole('dialog')
        .locator('input[type="file"]')
        .setInputFiles({
            name: 'moment.webm',
            mimeType: 'video/webm',
            buffer: await readFile('.cache/feed/moment.webm'),
        });
    await composer.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(
        page.locator('article[data-kind="moment"]').filter({ hasText: 'Отдельный момент из ленты' }),
    ).toBeVisible({ timeout: 25000 });
});

test('empty, loading and retry scenarios', async ({ page }) => {
    await page.goto('/ru/feed?scenario=empty');
    await expect(page.getByRole('heading', { name: 'Здесь начнётся история' })).toBeVisible();
    await page.goto('/ru/feed?scenario=loading');
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(6);
    await page.goto('/ru/feed?scenario=error');
    await page.getByRole('button', { name: 'Попробовать ещё раз', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(6);
    await page.goto('/ru/feed?scenario=more-error');
    await expect(page.getByRole('article')).toHaveCount(6);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('button', { name: 'Попробовать ещё раз', exact: true }).click();
    await expect.poll(() => page.getByRole('article').count()).toBeGreaterThanOrEqual(10);
    await page.goto('/ru/feed?scenario=publish-error');
    const composer = page.getByRole('region', { name: 'Что у вас нового?' });
    await composer.getByRole('textbox').fill('Черновик сохранится');
    await composer.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(composer.getByRole('alert')).toBeVisible();
    await expect(composer.getByRole('textbox')).toHaveValue('Черновик сохранится');
    await composer.getByRole('button', { name: 'Опубликовать', exact: true }).click();
    await expect(page.getByRole('article').first()).toContainText('Черновик сохранится');
});

test('redirects guests to sign-in before loading feed data and hides the feed link on the landing page', async ({
    page,
    context,
}) => {
    await context.clearCookies({ name: 'PERSONS_SESSION' });
    const dataRequests: string[] = [];
    page.on('request', (request) => {
        if (/\/api\/person\/.*\/(comments|photos|moments|ratings|credit|achievements)/.test(request.url())) {
            dataRequests.push(request.url());
        }
    });
    for (const locale of ['ru', 'en']) {
        await page.goto(`/${locale}/feed`);
        await expect(page).toHaveURL(new RegExp(`^http://localhost:3000/${locale}\\?returnTo=`));
        expect(new URL(page.url()).searchParams.get('returnTo')).toBe(`/person/${locale}/feed`);
        await expect(page.getByRole('article')).toHaveCount(0);
    }
    expect(dataRequests).toEqual([]);
    await page.goto('/ru');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Лента', exact: true })).toHaveCount(0);
});

for (const route of ['feed', 'people', 'person/krel']) {
    test(`scroll-to-top on ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 650 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`/ru/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        if (route === 'feed') {
            await expect(page.getByRole('article').first()).toBeVisible();
        }
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const top = page.getByRole('button', { name: 'Наверх', exact: true });
        await expect(top).toBeVisible();
        await expect(top).toHaveAttribute('data-visible', 'true');
        const rectangle = await top.boundingBox();
        expect(Math.round(rectangle?.width ?? 0)).toBe(Math.round(rectangle?.height ?? 1));
        expect(await top.evaluate((button) => getComputedStyle(button).borderRadius)).toBe('50%');
        await page.screenshot({ path: `test-results/scroll-top-${route.replace('/', '-')}.png` });
        await top.click();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.locator('button[aria-label="Наверх"]')).toHaveAttribute('data-visible', 'false');
    });
}
