import { expect, test } from '@playwright/test';

for (const width of [320, 1440]) {
    for (const theme of ['light', 'dark']) {
        test(`media viewer keeps metadata below the image and comments separate: ${width}, ${theme}`, async ({
            page,
            context,
            baseURL,
        }) => {
            await context.addCookies([{ name: 'PERSONS_THEME', value: theme, url: baseURL! }]);
            await page.setViewportSize({ width, height: 1000 });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto('/krel');
            await page.getByRole('tab', { name: /Фотографии/ }).click();
            const preview = page.getByRole('button', { name: 'Тот самый человек из нашей компании' });
            const previewSize = await preview.boundingBox();
            expect(previewSize!.width).toBeGreaterThan(width === 1440 ? 300 : 240);
            await preview.click();
            const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
            const photo = dialog.getByRole('img', { name: 'Тот самый человек из нашей компании' });
            await expect(photo).toBeVisible();
            await expect(dialog.getByRole('heading', { name: /Здесь начнётся/ })).toHaveCount(0);
            const image = (await photo.boundingBox())!;
            const like = (await dialog.getByRole('button', { name: 'Нравится', exact: true }).first().boundingBox())!;
            expect(like.y).toBeGreaterThanOrEqual(image.y + image.height - 2);
            const comments = (await dialog.getByRole('heading', { name: /Комментарии/ }).boundingBox())!;
            if (width === 1440) {
                expect(image.width).toBeGreaterThan(600);
                expect(comments.y).toBeGreaterThan(like.y);
            } else {
                expect(comments.y).toBeGreaterThan(like.y);
            }
            expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
            await page.screenshot({ path: `test-results/gallery-${theme}-${width}.png`, animations: 'disabled' });
        });
    }
}

test('uses card-shaped photo skeletons matching the loaded gallery', async ({ page }) => {
    await page.goto('/krel');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/api/person/v1/persons/*/photos*', async (route) => {
        await gate;
        await route.continue();
    });
    try {
        await page.getByRole('tab', { name: /Фотографии/ }).click();
        const tiles = page.locator('[class*="previewSkeleton"]');
        await expect(tiles).toHaveCount(6);
        const rect = (await tiles.first().boundingBox())!;
        expect(Math.abs(rect.width / rect.height - 4 / 3)).toBeLessThan(0.02);
        release();
        const preview = page.getByRole('button', { name: 'Тот самый человек из нашей компании' });
        await expect(preview).toBeVisible();
        expect(Math.abs((await preview.boundingBox())!.width - rect.width)).toBeLessThan(2);
    } finally {
        release();
    }
});

test('opens an achievement from an image-and-title card with its description and award date', async ({ page }) => {
    await page.goto('/krel');
    await page.getByRole('tab', { name: 'Достижения', exact: true }).click();
    const card = page.getByRole('button', { name: 'Разработчик', exact: true });
    await expect(card).toBeVisible();
    await expect(page.getByText('Превращает идеи в работающие вещи. Иногда даже с первого раза.')).toHaveCount(0);
    await card.click();
    const dialog = page.getByRole('dialog', { name: 'Разработчик' });
    await expect(dialog.getByRole('img', { name: 'Разработчик' })).toBeVisible();
    await expect(dialog.getByText('Превращает идеи в работающие вещи. Иногда даже с первого раза.')).toBeVisible();
    await expect(dialog.getByText(/^Выдано /)).toBeVisible();
});

test('keeps the verified badge expanded while the pointer stays over its original position on mobile', async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/krel');
    const badge = page.getByRole('button', { name: 'Эта страница официально подтверждена' });
    const before = (await badge.boundingBox())!;
    await page.mouse.move(before.x + before.width - 8, before.y + before.height - 8);
    await expect.poll(async () => (await badge.boundingBox())!.width).toBeGreaterThan(before.width);
    await expect(badge).toHaveCSS('height', '32px');
    const expanded = (await badge.boundingBox())!;
    expect(expanded.x).toBeGreaterThanOrEqual(0);
    expect(expanded.x + expanded.width).toBeLessThanOrEqual(320);
    expect(expanded.x).toBeCloseTo(before.x, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('plays a moment, seeks and enters and exits fullscreen with dedicated controls', async ({ page }) => {
    await page.goto('/krel');
    await page.getByRole('tab', { name: /Моменты/ }).click();
    await page.getByRole('button', { name: 'Ещё одна партия — иллюстрированный момент' }).click();
    const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
    const video = dialog.locator('video');
    await expect(video).toBeVisible();
    await expect.poll(async () => video.evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: 'Смотреть', exact: true }).last().click();
    await expect.poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
    const seek = dialog.getByRole('slider', { name: 'Позиция видео' });
    await seek.focus();
    await seek.press('ArrowRight');
    const fullscreen = dialog.getByRole('button', { name: 'На весь экран', exact: true });
    const centerOffset = await fullscreen.evaluate((element) => {
        const button = element.getBoundingClientRect();
        const icon = element.querySelector('svg')!.getBoundingClientRect();
        return Math.abs(button.y + button.height / 2 - icon.y - icon.height / 2);
    });
    expect(centerOffset).toBeLessThan(1);
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await fullscreen.click();
    await expect(dialog.getByRole('button', { name: 'Выйти из полноэкранного режима' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Выйти из полноэкранного режима' }).click();
    await expect(dialog.getByRole('button', { name: 'На весь экран', exact: true })).toBeVisible();
});
