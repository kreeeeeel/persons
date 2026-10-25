import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const ID_URL = process.env.E2E_ID_URL ?? 'http://localhost:3000';
const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';

async function signIn(page: Page) {
    const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
        email: string;
        password: string;
    };
    await page.goto(`${ID_URL}/ru?returnTo=${encodeURIComponent('/person/ru/krel')}`);
    await page.getByLabel('Электронная почта', { exact: true }).fill(account.email);
    await page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/krel$/);
    await expect(page.getByRole('button', { name: 'Аккаунт: Крел' })).toBeVisible();
}

test.afterEach(async ({ page, context, baseURL }) => {
    const signedIn = (await context.cookies()).some((cookie) => cookie.name === 'PERSONS_SESSION');
    if (signedIn) {
        await page.goto(`${baseURL}/ru`);
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Выйти из устройства', { exact: true }).click();
        await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
    }
});

test('searches actual personas after typing and navigates to a clean tag URL', async ({ page }) => {
    const queries: string[] = [];
    page.on('request', (request) => {
        if (request.url().includes('/v1/persons/search?')) {
            queries.push(new URL(request.url()).searchParams.get('q') ?? '');
        }
    });
    await page.goto('/ru');
    const search = page.getByRole('combobox');
    await search.fill('Кр');
    await search.fill('Кре');
    await search.fill('Крел');
    await expect(page.getByRole('option', { name: /Крел/ })).toBeVisible();
    expect(queries).toEqual(['Крел']);
    await search.press('Enter');
    await expect(page).toHaveURL(/\/krel$/);
    await expect(page.getByRole('heading', { name: 'Крел', exact: true })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
    for (const width of [320, 1440]) {
        test(`renders empty profile states and centered tabs: ${theme}, ${width}`, async ({
            page,
            context,
            baseURL,
        }) => {
            await context.addCookies([{ name: 'PERSONS_THEME', value: theme, url: baseURL! }]);
            await page.setViewportSize({ width, height: width === 320 ? 800 : 1000 });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto('/artem');
            await expect(page.getByRole('main').getByText('Нет отзывов', { exact: true })).toBeVisible();
            await expect(page.getByText('Здесь начнётся ваша история')).toBeVisible();
            await expect(page.getByRole('img', { name: /Крел предлагает/ })).toBeVisible();
            await page.getByRole('tab', { name: /Моменты/ }).click();
            await expect(page.getByText('Лучшее ещё впереди')).toBeVisible();
            await expect(page.getByRole('img', { name: /Никита/ })).toBeVisible();
            await page.getByRole('tab', { name: /Фотографии/ }).click();
            await expect(page.getByText('Пока без фотографий')).toBeVisible();
            await expect(page.getByRole('img', { name: /Тямик/ })).toBeVisible();
            await page.getByRole('tab', { name: 'Займы' }).click();
            await expect(page.getByText('Пока без займов')).toBeVisible();
            await expect(page.getByRole('img', { name: /Грустный Вадим/ })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            const center = await page.getByRole('tablist').evaluate((element) => {
                const bounds = element.parentElement!.getBoundingClientRect();
                return bounds.x + bounds.width / 2;
            });
            expect(Math.abs(center - width / 2)).toBeLessThan(2);
            await page.screenshot({
                path: `test-results/profile-empty-${theme}-${width}.png`,
                fullPage: true,
                animations: 'disabled',
            });
        });
    }
}

test('plays a real S3 moment, seeks it, opens photos and shows social buttons', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/krel');
    for (const network of ['Telegram', 'Steam', 'Discord']) {
        const link = page.getByRole('link', { name: network, exact: true });
        await expect(link).toBeVisible();
        await expect(link.locator('img')).toHaveAttribute('src', /\/media\/social-/);
    }
    await expect(page.getByRole('main').getByText('Средняя', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Моменты/ }).click();
    await page.getByRole('tabpanel').getByRole('button').first().click();
    const video = page.getByRole('dialog').locator('video');
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).readyState)).toBeGreaterThan(0);
    expect(await video.evaluate((element) => (element as HTMLVideoElement).controls)).toBe(false);
    await page.getByRole('button', { name: 'Смотреть', exact: true }).last().click();
    await expect
        .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
        .toBeGreaterThan(0.1);
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
    await video.focus();
    await video.press('ArrowRight');
    await expect
        .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
        .toBeGreaterThan(4.9);
    await expect(page.getByText('Этот раунд надо пересмотреть!')).toBeVisible();
    await page
        .getByRole('dialog')
        .getByRole('button', { name: /Закрыть|Close/ })
        .click();
    await page.getByRole('tab', { name: /Фотографии/ }).click();
    await page.getByRole('button', { name: 'Тот самый человек из нашей компании' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('shows full-body Vadim on missing persona and arbitrary missing routes', async ({ page }) => {
    for (const route of ['/this-person-is-missing', '/ru/missing/route']) {
        await page.goto(route);
        await expect(page.getByRole('heading', { name: 'Кажется, здесь никого' })).toBeVisible();
        const art = page.getByRole('img', { name: /Вадим в полный рост/ });
        await expect(art).toBeVisible();
        await expect
            .poll(() => art.evaluate((element) => (element as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
        await page.getByRole('link', { name: 'На главную' }).click();
        await expect(page).toHaveURL(/\/ru$/);
    }
});

test('returns from ID to a persona, opens sessions in place and moderates a submitted story', async ({
    page,
    baseURL,
}) => {
    test.setTimeout(90000);
    await signIn(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
    await page.getByText('Мои сессии', { exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Мои сессии' })).toBeVisible();
    await expect(page.getByText('Текущее устройство')).toBeVisible();
    await expect(page.getByText(/Chrome.*Windows|Chrome.*Linux/).first()).toBeVisible();
    const sessionDialog = page.getByRole('dialog', { name: 'Мои сессии' });
    for (const button of await sessionDialog.getByRole('button').all()) {
        const bounds = await button.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    }
    await expect(page).toHaveURL(/\/krel$/);
    await page
        .getByRole('dialog')
        .getByRole('button', { name: /Закрыть|Close/ })
        .click();
    await page.getByRole('button', { name: 'Редактировать', exact: true }).first().click();
    const submitProfile = page.getByRole('button', { name: 'Отправить на модерацию', exact: true });
    await expect(submitProfile).toBeVisible();
    expect(
        await submitProfile
            .getByText('Отправить на модерацию', { exact: true })
            .evaluate(
                (element) => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
            ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const text = `Проверка согласования ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Ваша история' }).fill(text);
    await page.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(page.getByText('Отправлено на модерацию. Решение появится в уведомлениях.')).toBeVisible();
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByText('На модерации', { exact: true }).first()).toBeVisible();
    await page.goto(`${ADMIN_URL}/ru/moderation`);
    await expect(page.getByRole('heading', { name: 'Модерация', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Предлагаемые данные' }).first()).toBeVisible();
    for (const button of await page.getByRole('button', { name: 'Предлагаемые данные' }).all()) {
        await button.click();
    }
    const request = page.getByRole('article').filter({ hasText: text });
    await request.getByRole('button', { name: 'Согласовать', exact: true }).click();
    await expect(page.getByText('Решение сохранено.')).toBeVisible();
    await page.goto(`${baseURL}/krel`);
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
    await page.getByText('Уведомления', { exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Согласовано', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    const feed = (await (
        await page.request.get(
            `${baseURL}/api/person/v1/persons/${JSON.parse(await readFile(path.resolve('../../.build/person-demo-state.json'), 'utf8')).krel}/comments`,
        )
    ).json()) as { items: { id: string; text: string }[] };
    const comment = feed.items.find((item) => item.text === text)!;
    const removal = (await (
        await page.request.delete(`${baseURL}/api/person/v1/comments/${comment.id}`, { headers: { origin: baseURL! } })
    ).json()) as { id: string };
    const decision = await page.request.post(`${ADMIN_URL}/api/person/v1/admin/moderation/${removal.id}/decision`, {
        headers: { origin: ADMIN_URL },
        data: { decision: 'APPROVE' },
    });
    expect(decision.status()).toBe(200);
});
