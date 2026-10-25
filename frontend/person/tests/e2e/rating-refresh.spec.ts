import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { PersonProfile, RatingState } from '@persons/person-client';

const ID = process.env.E2E_ID_URL ?? 'http://localhost:3000';
const CMS = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';

for (const target of ['person', 'cms'] as const) {
    test(`preserves the rating form, draft and sorting after mutations in ${target}`, async ({
        page,
        context,
        baseURL,
    }) => {
        const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
            email: string;
            password: string;
        };
        await page.goto(`${ID}/ru?returnTo=%2Fperson%2Fru%2Fkrel`);
        await page.getByLabel('Электронная почта', { exact: true }).fill(account.email);
        await page.getByLabel('Пароль', { exact: true }).fill(account.password);
        await page.getByRole('button', { name: 'Войти', exact: true }).click();
        await expect(page).toHaveURL(/\/krel$/);
        try {
            const profile = (await (
                await page.request.get('/api/person/v1/persons/by-tag/krel')
            ).json()) as PersonProfile;
            let rating: RatingState = {
                options: profile.ratingOptions,
                availableEmojis: ['⭐', '🐰'],
                value: 3,
                emoji: '⭐',
            };
            let mutations = 0;
            const sorts: string[] = [];
            await page.route('**/api/person/v1/persons/by-tag/krel', async (route) => {
                await new Promise((resolve) => setTimeout(resolve, 200));
                await route.fulfill({
                    json: {
                        ...profile,
                        version: profile.version + mutations,
                        rating,
                        stats: { ...profile.stats, ratingAverage: rating.value, calculationPending: false },
                    },
                });
            });
            await page.route(`**/api/person/v1/persons/${profile.id}/ratings?*`, async (route) => {
                sorts.push(new URL(route.request().url()).searchParams.get('sort') ?? '');
                await new Promise((resolve) => setTimeout(resolve, 200));
                await route.fulfill({
                    json: {
                        items: [
                            {
                                id: 'fixture-rating',
                                value: 4,
                                emoji: '⭐',
                                authorName: 'Друг',
                                authorTag: 'vadim',
                                createdAt: new Date().toISOString(),
                                likes: 0,
                                dislikes: 0,
                            },
                        ],
                        total: 1,
                        page: 0,
                        size: 12,
                    },
                });
            });
            await page.route(`**/api/person/v1/persons/${profile.id}/rating`, async (route) => {
                const input = route.request().postDataJSON() as {
                    value: number;
                    emoji?: string;
                    optionId?: string;
                    comment: string;
                };
                rating = {
                    ...rating,
                    ...input,
                    emoji:
                        input.emoji ??
                        rating.options.find((option) => option.id === input.optionId)?.emoji ??
                        rating.emoji,
                    commentStatus: 'PENDING',
                };
                mutations += 1;
                await route.fulfill({ json: rating });
            });
            await page.goto(target === 'cms' ? `${CMS}/ru/persons/krel` : '/krel');
            await page.getByRole('tab', { name: 'Оценки', exact: true }).click();
            await expect(page.getByRole('link', { name: 'Друг', exact: true })).toBeVisible();
            await page.getByRole('combobox', { name: 'Сортировка' }).click();
            await page.getByRole('option', { name: 'Сначала старые', exact: true }).click();
            await expect.poll(() => sorts.at(-1)).toBe('OLDEST');
            await expect(page.getByRole('link', { name: 'Друг', exact: true })).toBeVisible();
            await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
            const input = page.getByLabel('Комментарий к оценке · необязательно');
            await input.fill('Отличная компания');
            await input.evaluate((element) => {
                element.setAttribute('data-regression-identity', 'retained');
            });
            await page.getByRole('link', { name: 'Друг', exact: true }).evaluate((element) => {
                element.setAttribute('data-regression-identity', 'retained');
            });
            const routeRefreshes: string[] = [];
            page.on('request', (request) => {
                if (new URL(request.url()).searchParams.has('_rsc')) {
                    routeRefreshes.push(request.url());
                }
            });
            await page.getByRole('button', { name: 'Поставить 4 из 5' }).click();
            expect(mutations).toBe(0);
            await expect(page.getByRole('button', { name: 'Эмодзи оценки' })).toBeEnabled();
            await page.getByRole('button', { name: 'Эмодзи оценки' }).click();
            await page.getByRole('option', { name: '🐰', exact: true }).click();
            expect(mutations).toBe(0);
            await expect(page.getByRole('button', { name: 'Сохранить' })).toBeEnabled();
            await page.getByRole('button', { name: 'Сохранить' }).click();
            await expect.poll(() => mutations).toBe(1);
            await expect(page.getByRole('article', { name: 'Ваш отзыв' })).toContainText('Отличная компания');
            await expect(input).toHaveCount(0);
            await expect(page.getByRole('link', { name: 'Друг', exact: true })).toHaveAttribute(
                'data-regression-identity',
                'retained',
            );
            await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveText('Сначала старые');
            await expect(page.getByRole('article', { name: 'Ваш отзыв' })).toContainText('🐰🐰🐰🐰');
            await expect(page.getByRole('link', { name: 'Друг', exact: true })).toBeVisible();
            expect(sorts.slice(1).every((sort) => sort === 'OLDEST')).toBe(true);
            expect(routeRefreshes).toEqual([]);
            await page.screenshot({ path: `test-results/rating-refresh-${target}.png`, fullPage: true });
        } finally {
            await page.unrouteAll({ behavior: 'wait' });
            if ((await context.cookies()).some((cookie) => cookie.name === 'PERSONS_SESSION')) {
                await page.goto(`${baseURL}/ru`);
                await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
                await page.getByText('Выйти из устройства', { exact: true }).click();
                await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
            }
        }
    });
}
