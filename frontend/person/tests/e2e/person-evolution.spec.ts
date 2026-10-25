import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { MediaDetail, PersonProfile, RatingState } from '@persons/person-client';

const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';
const ID = process.env.E2E_ID_URL ?? 'http://localhost:3000';
async function png(page: Page) {
    return page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#713be8';
        context.fillRect(0, 0, 32, 32);
        return canvas.toDataURL('image/png').split(',')[1];
    });
}

async function signIn(page: Page) {
    const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
        email: string;
        password: string;
    };
    await page.goto(`${ID}/ru?returnTo=${encodeURIComponent('/person/ru/krel')}`);
    await page.getByLabel('Электронная почта', { exact: true }).fill(account.email);
    await page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/krel$/);
}

test.afterEach(async ({ page, context, baseURL }) => {
    if ((await context.cookies()).some(({ name }) => name === 'PERSONS_SESSION')) {
        await page.goto(`${baseURL}/ru`);
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Выйти из устройства', { exact: true }).click();
        await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
    }
});

for (const theme of ['light', 'dark'] as const) {
    for (const width of [320, 1440]) {
        test(`keeps the header fixed, centers content and renders transparent states: ${theme}, ${width}`, async ({
            page,
            context,
            baseURL,
        }) => {
            await context.addCookies([{ name: 'PERSONS_THEME', value: theme, url: baseURL! }]);
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto('/krel');
            const header = page.getByRole('banner');
            await expect(header).toHaveCSS('position', 'fixed');
            await expect(header).toHaveAttribute('data-scrolled', 'false');
            const social = page.getByRole('link', { name: 'Telegram', exact: true });
            const centerDifference = await social.evaluate((element) => {
                const button = element.getBoundingClientRect();
                const icon = element.querySelector('img')!.getBoundingClientRect();
                return Math.abs(button.y + button.height / 2 - icon.y - icon.height / 2);
            });
            expect(centerDifference).toBeLessThan(2);
            await page.evaluate(() => scrollTo(0, 300));
            await expect(header).toHaveAttribute('data-scrolled', 'true');
            expect((await header.boundingBox())!.y).toBe(0);
            await page.goto('/artem');
            const empty = page.getByRole('heading', { name: 'Здесь начнётся ваша история' });
            await expect(empty).toBeVisible();
            expect(await empty.evaluate((element) => getComputedStyle(element.parentElement!).backgroundColor)).toBe(
                'rgba(0, 0, 0, 0)',
            );
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({ path: `test-results/profile-layout-${theme}-${width}.png`, fullPage: true });
        });
    }
}

test('opens photo details with tagged people, switches reactions and restores the previous vote', async ({
    page,
    baseURL,
}) => {
    await signIn(page);
    const profile = (await (await page.request.get('/api/person/v1/persons/by-tag/krel')).json()) as PersonProfile;
    const photos = (await (await page.request.get(`/api/person/v1/persons/${profile.id}/photos`)).json()) as {
        items: { mediaId: string }[];
    };
    const id = photos.items[0].mediaId;
    const before = (await (await page.request.get(`/api/person/v1/media/${id}/details`)).json()) as MediaDetail;
    try {
        await page.getByRole('tab', { name: /Фотографии/ }).click();
        await page.getByRole('button', { name: 'Тот самый человек из нашей компании' }).click();
        const dialog = page.getByRole('dialog', { name: 'Просмотр медиа' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Кто отмечен', { exact: true })).toBeVisible();
        await expect(dialog.getByRole('link', { name: 'Вадим', exact: true })).toHaveAttribute('href', '/vadim');
        const dislike = dialog.getByRole('button', { name: 'Не нравится', exact: true });
        if (before.reactions.reaction === 'DISLIKE') {
            await dislike.click();
            await expect(dislike).toHaveAttribute('aria-pressed', 'false');
        }
        await dislike.click();
        await expect(dislike).toHaveAttribute('aria-pressed', 'true');
        await dialog.getByRole('button', { name: 'Нравится', exact: true }).first().click();
        await expect(dislike).toHaveAttribute('aria-pressed', 'false');
        await expect(dialog.getByRole('button', { name: 'Нравится', exact: true }).first()).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    } finally {
        const url = `${baseURL}/api/person/v1/media/${id}/reaction`;
        const result = before.reactions.reaction
            ? await page.request.put(url, {
                  headers: { origin: baseURL! },
                  data: { reaction: before.reactions.reaction },
              })
            : await page.request.delete(url, { headers: { origin: baseURL! } });
        expect(result.ok()).toBe(true);
    }
});

test('persists a rating out of five and lets the author change the rating emoji', async ({ page, baseURL }) => {
    await signIn(page);
    const profile = (await (await page.request.get('/api/person/v1/persons/by-tag/krel')).json()) as PersonProfile;
    const url = `${baseURL}/api/person/v1/persons/${profile.id}/rating`;
    const before = (await (await page.request.get(url)).json()) as RatingState;
    try {
        await page.getByRole('tab', { name: 'Оценки', exact: true }).click();
        await page.getByRole('button', { name: 'Поставить 4 из 5' }).click();
        await expect(page.getByRole('button', { name: 'Поставить 4 из 5' })).toHaveAttribute('aria-pressed', 'true');
        await page.getByLabel('Эмодзи оценки', { exact: true }).click();
        await page.getByRole('option', { name: '🐰', exact: true }).click();
        await expect.poll(async () => ((await (await page.request.get(url)).json()) as RatingState).emoji).toBe('🐰');
        await expect(page.getByRole('button', { name: 'Поставить 4 из 5' })).toContainText('🐰');
        await expect(page.getByRole('heading', { name: 'Оценки людей' })).toBeVisible();
    } finally {
        const result = before.value
            ? await page.request.put(url, {
                  headers: { origin: baseURL! },
                  data: { optionId: before.optionId, emoji: before.emoji, value: before.value },
              })
            : await page.request.delete(url, { headers: { origin: baseURL! } });
        expect(result.ok()).toBe(true);
    }
});

test('shows a verified page badge and sends anonymous ownership requests through ID', async ({ page }) => {
    await page.goto('/krel');
    const badge = page.getByRole('button', { name: 'Эта страница официально подтверждена' });
    const collapsed = (await badge.boundingBox())!.width;
    await badge.hover();
    await expect(badge).toHaveAttribute('title', 'Эта страница официально подтверждена');
    await expect(badge.locator('svg')).toHaveCount(1);
    await expect.poll(async () => (await badge.boundingBox())!.width).toBeGreaterThan(collapsed + 50);
    expect((await badge.boundingBox())!.width).toBeLessThan(300);
    await expect(
        page
            .getByRole('main')
            .getByRole('link', { name: /Крел Демо/ })
            .first(),
    ).toHaveAttribute('href', '/krel');
    await page.goto('/artem');
    await page.getByRole('link', { name: 'Это моя страница' }).click();
    await expect(page.getByRole('textbox', { name: 'Электронная почта', exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/person/ru/artem');
});

test('uses the admin sidebar to create an achievement and award it to several people', async ({ page, baseURL }) => {
    test.setTimeout(90000);
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${ADMIN}/ru/persons`);
    const nav = page.getByRole('navigation', { name: 'Разделы администрирования' });
    await expect(nav).toBeVisible();
    expect((await page.getByRole('main').boundingBox())!.x).toBeGreaterThan((await nav.boundingBox())!.x);
    await nav.getByRole('link', { name: 'Достижения', exact: true }).click();
    const title = `Достижение проверки ${Date.now()}`;
    let id: string | undefined;
    try {
        await page.getByRole('button', { name: 'Создать достижение' }).click();
        await page.getByRole('textbox', { name: 'Название достижения' }).fill(title);
        await page.getByRole('textbox', { name: 'Описание достижения' }).fill('За проверенную дружбу и общие истории');
        await page.getByLabel('Изображение достижения', { exact: true }).setInputFiles({
            name: 'achievement.png',
            mimeType: 'image/png',
            buffer: Buffer.from(await png(page), 'base64'),
        });
        const created = page.waitForResponse(
            (response) =>
                response.url().includes('/api/person/v1/admin/achievements') && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
        const response = await created;
        expect(response.status()).toBe(201);
        id = ((await response.json()) as { id: string }).id;
        const card = page.getByRole('article').filter({ hasText: title });
        await card.getByRole('button', { name: 'Выдать достижение', exact: true }).click();
        await page.getByLabel('Кому выдать', { exact: true }).click();
        const filter = page.getByPlaceholder('Имя или тег персоны');
        await filter.fill('Крел');
        await page.getByRole('option', { name: 'Крел', exact: true }).click();
        await filter.fill('Вадим');
        await page.getByRole('option', { name: 'Вадим', exact: true }).click();
        await filter.press('Escape');
        await page.getByRole('textbox', { name: 'За что выдано' }).fill('За командную работу');
        await page.getByRole('dialog').getByRole('button', { name: 'Выдать достижение', exact: true }).click();
        await expect(page.getByText('Выдано: 2. Повторные выдачи не дублируются.')).toBeVisible();
        await page.goto(`${baseURL}/krel`);
        await page.getByRole('tab', { name: 'Достижения', exact: true }).click();
        await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    } finally {
        if (id) {
            const result = await page.request.delete(`${ADMIN}/api/person/v1/admin/achievements/${id}`, {
                headers: { origin: ADMIN },
            });
            expect(result.status()).toBe(204);
        }
    }
});
