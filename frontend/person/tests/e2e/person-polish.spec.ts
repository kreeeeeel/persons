import { readFile } from 'node:fs/promises';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Configuration, IdApi } from '@persons/id-client';

const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';
const ID = process.env.E2E_ID_URL ?? 'http://localhost:3000';
const PERSON = process.env.E2E_BASE_URL ?? 'http://localhost:3002';
const ID_API = process.env.E2E_ID_BASE_URL ?? 'http://localhost:8081';
const DEMO_ACCOUNT_ID = 'e4b79553-adad-4386-a195-9b1451227ec6';

const personDatabase = (statement: string) =>
    execFileSync(
        'docker',
        ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'persons', '-d', 'person', '-v', 'ON_ERROR_STOP=1', '-qAt'],
        { cwd: path.resolve('../..'), input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );

test('opens the account photo cropper and cancels without changing the saved avatar', async ({ page }) => {
    await signIn(page);
    await page.goto('/krel');
    await page.getByRole('button', { name: /Аккаунт:/ }).click();
    await page.getByRole('menuitem', { name: 'Сменить фотографию' }).click();
    const dialog = page.getByRole('dialog', { name: 'Сменить фотографию', exact: true });
    await expect(dialog.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await dialog.locator('input[type=file]').setInputFiles(path.resolve('../assets/branding/vadim-generated-v1.png'));
    const editor = page.getByRole('dialog', { name: 'Редактирование фотографии', exact: true });
    await expect(editor).toBeVisible();
    await editor.getByRole('button', { name: 'Применить', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Сохранить' })).toBeEnabled();
    await page.screenshot({ path: 'test-results/account-avatar-editor.png' });
    await dialog.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(dialog).toHaveCount(0);
});

test('sorts complete content feeds and persists exclusive likes and dislikes in the site and CMS', async ({ page }) => {
    test.setTimeout(90000);
    const person = randomUUID();
    const tag = 'qa-reactions-' + person.slice(0, 8);
    const author = randomUUID();
    const feeds = [
        { kind: 'COMMENT', path: 'comments', tab: 'Стена', ids: [randomUUID(), randomUUID(), randomUUID()] },
        { kind: 'LOAN', path: 'credit', tab: 'Займы', ids: [randomUUID(), randomUUID(), randomUUID()] },
        { kind: 'RATING', path: 'ratings', tab: 'Оценки', ids: [randomUUID(), randomUUID(), randomUUID()] },
    ];
    const setup = feeds.flatMap((feed) =>
        feed.ids.map((id, index) => {
            const caption = `Проверка ${feed.kind} ${index}`;
            const date = `now()-interval '${3 - index} hours'`;
            if (feed.kind === 'COMMENT') {
                return `INSERT INTO person_comments(id,person_id,author_id,author_name,text,created_at) VALUES ('${id}','${person}','${author}','Участник','${caption}',${date});`;
            }
            if (feed.kind === 'LOAN') {
                return `INSERT INTO person_credit_entries(id,person_id,kind,description,author_id,author_name,created_at) VALUES ('${id}','${person}','ON_TIME','${caption}','${author}','Участник',${date});`;
            }
            return `INSERT INTO person_ratings(id,person_id,user_id,rating_value,author_name,comment,created_at) VALUES ('${id}','${person}','${randomUUID()}',4,'Участник','${caption}',${date});`;
        }),
    );
    personDatabase(`BEGIN;
        INSERT INTO persons(id,tag,first_name,last_name,description,published,created_at)
            VALUES ('${person}','${tag}','Проверка','Реакций','Временная проверка сортировки',true,now());
        INSERT INTO person_social_links(id,person_id,network,url) VALUES (gen_random_uuid(),'${person}','DISCORD','qa.person');
        ${setup.join('\n')}
        ${feeds
            .map(
                (feed) => `INSERT INTO content_likes(id,target_kind,target_id,user_id,created_at,author_name)
            SELECT gen_random_uuid(),'${feed.kind}','${feed.ids[0]}',gen_random_uuid(),now(),'Участник ' || n FROM generate_series(1,13) AS n;
            INSERT INTO content_likes(id,target_kind,target_id,user_id,created_at,reaction)
            SELECT gen_random_uuid(),'${feed.kind}','${feed.ids[1]}',gen_random_uuid(),now(),'DISLIKE' FROM generate_series(1,3);`,
            )
            .join('\n')}
        INSERT INTO person_aggregate_queue(person_id,requested_at) VALUES ('${person}',now());
        COMMIT;`);
    try {
        await signIn(page);
        await page.goto('/' + tag);
        await expect(page.getByRole('button', { name: 'Discord · qa.person', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Редактировать', exact: true }).first().click();
        await expect(page.getByRole('textbox', { name: 'Discord · тег' })).toHaveValue('qa.person');
        await expect(page.getByRole('textbox', { name: 'Discord · тег' })).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Отмена', exact: true }).click();
        for (const feed of feeds) {
            await page.getByRole('tab', { name: feed.tab, exact: true }).click();
            for (const [label, sort, index] of [
                ['Сначала старые', 'OLDEST', 0],
                ['Больше лайков', 'MOST_LIKED', 0],
                ['Больше дизлайков', 'MOST_DISLIKED', 1],
            ] as const) {
                const next = page.waitForResponse(
                    (response) =>
                        response.url().includes(`/persons/${person}/${feed.path}?`) &&
                        new URL(response.url()).searchParams.get('sort') === sort,
                );
                await page.getByRole('combobox', { name: 'Сортировка' }).click();
                await page.getByRole('option', { name: label, exact: true }).click();
                const result = (await (await next).json()) as { items: { id: string }[] };
                expect(result.items[0].id).toBe(feed.ids[index]);
            }
            const card = page.getByText(`Проверка ${feed.kind} 1`, { exact: true }).locator('..');
            await card.getByRole('button', { name: 'Нравится', exact: true }).click();
            await expect(card.getByRole('button', { name: 'Кому понравилось: 1' })).toHaveText('1');
            await card.getByRole('button', { name: 'Кому понравилось: 1' }).hover();
            const likedBy = page.getByRole('dialog', { name: 'Кому понравилось', exact: true });
            await expect(likedBy.getByRole('link', { name: /Крел/ })).toHaveAttribute('href', '/krel');
            await expect(likedBy.getByRole('link', { name: /Крел/ }).locator('img')).toBeVisible();
            if (feed.kind === 'COMMENT') {
                await page.screenshot({ path: 'test-results/content-voter-profile.png' });
            }
            await page.keyboard.press('Escape');
            await expect(likedBy).toBeHidden();
            await expect(card.getByRole('button', { name: 'Не нравится', exact: true })).toBeEnabled();
            await card.getByRole('button', { name: 'Не нравится', exact: true }).click();
            await expect(card.getByRole('button', { name: 'Кому не понравилось: 4' })).toHaveText('4');
            await expect(card.getByRole('button', { name: 'Кому понравилось: 0' })).toHaveText('0');
            await expect(card.getByRole('button', { name: 'Убрать дизлайк' })).toBeEnabled();
            await card.getByRole('button', { name: 'Убрать дизлайк' }).click();
            await expect(card.getByRole('button', { name: 'Кому не понравилось: 3' })).toHaveText('3');
            const votersCard = page.getByText(`Проверка ${feed.kind} 0`, { exact: true }).locator('..');
            await votersCard.getByRole('button', { name: 'Кому понравилось: 13' }).hover();
            const voters = page.getByRole('dialog', { name: 'Кому понравилось', exact: true });
            await expect(voters.getByText(/^Участник \d+$/)).toHaveCount(12);
            await voters.hover();
            await page.mouse.wheel(0, 1000);
            await expect(voters.getByText(/^Участник \d+$/)).toHaveCount(13);
            await page.screenshot({ path: `test-results/content-voters-${feed.kind.toLowerCase()}.png` });
            await page.keyboard.press('Escape');
            await expect(voters).toBeHidden();
        }
        await page.screenshot({ path: 'test-results/content-dislikes-sorting.png' });
        await page.goto(`${ADMIN}/ru/persons/${tag}`);
        await expect(page.getByRole('combobox', { name: 'Сортировка' })).toBeVisible();
        await page.getByRole('combobox', { name: 'Сортировка' }).click();
        await page.getByRole('option', { name: 'Больше дизлайков', exact: true }).click();
        const card = page.getByText('Проверка COMMENT 1', { exact: true }).locator('..');
        await card.getByRole('button', { name: 'Не нравится', exact: true }).click();
        await expect(card.getByRole('button', { name: 'Кому не понравилось: 4' })).toHaveText('4');
        await card.getByRole('button', { name: 'Кому не понравилось: 4' }).hover();
        await expect(
            page.getByRole('dialog', { name: 'Кому не понравилось' }).getByRole('link', { name: /Крел/ }),
        ).toHaveAttribute('href', PERSON + '/krel');
    } finally {
        personDatabase(`BEGIN;
            SELECT id FROM persons WHERE id='${person}' FOR UPDATE;
            DELETE FROM content_likes WHERE target_id IN (${feeds
                .flatMap((feed) => feed.ids)
                .map((id) => `'${id}'`)
                .join(',')});
            DELETE FROM person_views WHERE person_id='${person}';
            DELETE FROM person_comments WHERE person_id='${person}';
            DELETE FROM person_credit_entries WHERE person_id='${person}';
            DELETE FROM person_ratings WHERE person_id='${person}';
            DELETE FROM person_social_links WHERE person_id='${person}';
            DELETE FROM persons WHERE id='${person}';
            COMMIT;`);
    }
});

test('keeps photo and video reaction counter backgrounds transparent on hover', async ({ page }) => {
    for (const [tab, title] of [
        [/Фотографии/, 'Тот самый человек из нашей компании'],
        [/Моменты/, 'Ещё одна партия — иллюстрированный момент'],
    ] as const) {
        await page.goto('/krel');
        await page.getByRole('tab', { name: tab }).click();
        await page.getByRole('button', { name: title, exact: true }).click();
        const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
        for (const name of [/Кому понравилось:/, /Кому не понравилось:/]) {
            const counter = viewer.getByRole('button', { name }).first();
            const before = await counter.evaluate((element) => getComputedStyle(element).backgroundColor);
            await counter.hover();
            await expect(counter).toHaveCSS('background-color', before);
            expect(before).toBe('rgba(0, 0, 0, 0)');
            const voters = page.getByRole('dialog', {
                name: name.source.includes('не') ? 'Кому не понравилось' : 'Кому понравилось',
                exact: true,
            });
            await expect(voters).toBeVisible();
            await expect(voters).not.toHaveAttribute('aria-modal', 'true');
            await voters.hover();
            await page.waitForTimeout(250);
            await expect(voters).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(voters).toBeHidden();
            await expect(viewer).toBeVisible();
        }
        if (tab.source === 'Моменты') {
            const thumbs = viewer.getByRole('slider');
            await expect(thumbs).toHaveCount(2);
            await expect(thumbs.first()).toBeEnabled();
            for (const thumb of await thumbs.all()) {
                const appearance = await thumb.evaluate((element) => {
                    const css = getComputedStyle(element);
                    return { width: css.width, background: css.backgroundColor, border: css.borderColor };
                });
                expect(appearance.width).toBe('15px');
                expect(appearance.background).toBe(appearance.border);
                expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)');
            }
        }
    }
});

test('appends comments on scroll with a rotating logo and a borderless glass header', async ({ page }) => {
    let release: (() => void) | undefined;
    const secondPage = new Promise<void>((resolve) => {
        release = resolve;
    });
    const requested: number[] = [];
    await page.route('**/api/person/v1/persons/*/comments?*', async (route) => {
        const url = new URL(route.request().url());
        const number = Number(url.searchParams.get('page'));
        requested.push(number);
        if (number === 1) {
            await secondPage;
        }
        await route.fulfill({
            json: {
                page: number,
                size: 10,
                total: 25,
                items: Array.from({ length: Math.min(10, 25 - number * 10) }, (_, index) => ({
                    id: `scroll-${number * 10 + index}`,
                    text: `Проверка прокрутки ${number * 10 + index + 1}`,
                    authorName: 'Проверка ленты',
                    createdAt: '2026-10-18T00:00:00Z',
                    canRemove: false,
                    likes: 0,
                })),
            },
        });
    });
    try {
        await page.goto('/krel');
        await expect(page.getByText('Проверка прокрутки 1', { exact: true })).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const loader = page.getByRole('status').filter({ has: page.locator('img[src*="logo.svg"]') });
        await expect(loader).toBeVisible();
        expect(await loader.locator('img').evaluate((element) => getComputedStyle(element).animationName)).not.toBe(
            'none',
        );
        await expect(page.getByRole('banner')).toHaveCSS('border-bottom-width', '0px');
        await expect(page.getByRole('banner')).toHaveCSS('box-shadow', 'none');
        await expect
            .poll(() => page.getByRole('banner').evaluate((element) => getComputedStyle(element).backdropFilter))
            .toContain('blur(24px)');
        await page.screenshot({ path: 'test-results/infinite-comments-logo-glass.png' });
        release?.();
        await expect(page.getByText('Проверка прокрутки 20', { exact: true })).toBeAttached();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(page.getByText('Проверка прокрутки 25', { exact: true })).toBeAttached();
        expect(requested).toEqual([0, 1, 2]);
        await expect(page.getByText('Проверка прокрутки 1', { exact: true })).toBeAttached();
        await expect(page.getByRole('button', { name: 'Загрузить ещё' })).toHaveCount(0);
    } finally {
        release?.();
    }
});

test('appends media comments inside the scrolling dialog', async ({ page }) => {
    const requested: number[] = [];
    await page.route('**/api/person/v1/persons/*/comments?*', async (route) => {
        const url = new URL(route.request().url());
        if (!url.searchParams.has('mediaId')) {
            await route.continue();
            return;
        }
        const number = Number(url.searchParams.get('page'));
        requested.push(number);
        await route.fulfill({
            json: {
                page: number,
                size: 10,
                total: 25,
                items: Array.from({ length: Math.min(10, 25 - number * 10) }, (_, index) => ({
                    id: `media-scroll-${number * 10 + index}`,
                    text: `Медиа-комментарий ${number * 10 + index + 1}`,
                    authorName: 'Проверка ленты',
                    createdAt: '2026-10-18T00:00:00Z',
                    canRemove: false,
                    likes: 0,
                })),
            },
        });
    });
    await page.goto('/krel');
    await page.getByRole('tab', { name: /Фотографии/ }).click();
    await page.getByRole('button', { name: 'Тот самый человек из нашей компании' }).click();
    const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
    await viewer.getByText('Медиа-комментарий 10', { exact: true }).scrollIntoViewIfNeeded();
    await expect(viewer.getByText('Медиа-комментарий 20', { exact: true })).toBeAttached();
    await viewer.getByText('Медиа-комментарий 20', { exact: true }).scrollIntoViewIfNeeded();
    await expect(viewer.getByText('Медиа-комментарий 25', { exact: true })).toBeAttached();
    expect(requested).toEqual([0, 1, 2]);
    await expect(viewer.getByText('Медиа-комментарий 1', { exact: true })).toBeAttached();
});

test('refreshes worker rating totals without losing a review draft', async ({ page }) => {
    const id = randomUUID();
    const option = randomUUID();
    const tag = 'qa-worker-' + id.slice(0, 8);
    personDatabase(`BEGIN;
        INSERT INTO persons(id,tag,first_name,last_name,description,published,created_at)
            VALUES ('${id}','${tag}','Проверка','Воркера','Временная проверка фонового расчёта',true,now());
        INSERT INTO person_rating_options(id,person_id,emoji,label,position,enabled)
            VALUES ('${option}','${id}','⭐','Звезда',0,true);
        INSERT INTO person_aggregate_queue(person_id,requested_at) VALUES ('${id}',now());
        COMMIT;`);
    try {
        await signIn(page);
        await page.goto('/' + tag);
        await expect
            .poll(
                async () => {
                    const response = await page.request.get(`${PERSON}/api/person/v1/persons/by-tag/${tag}`);
                    return (await response.json()).stats.calculationPending;
                },
                { timeout: 15000 },
            )
            .toBe(false);
        await page.getByRole('tab', { name: 'Оценки', exact: true }).click();
        await page.getByRole('button', { name: 'Поставить 4 из 5' }).click();
        const comment = page.getByRole('textbox', { name: 'Комментарий к оценке · необязательно' });
        await comment.fill('Этот черновик должен сохраниться');
        await expect(page.getByText('4.0 / 5', { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(comment).toHaveValue('Этот черновик должен сохраниться');
        await expect(page.getByText('4.0 / 5', { exact: true })).toHaveAttribute('data-tone', 'good');
        await expect(page.getByText('Хорошая', { exact: true })).toBeVisible();
        const choose = page.getByText('Выберите эмодзи для оценки');
        const chooserBox = await choose.boundingBox();
        const commentBox = await comment.boundingBox();
        expect(chooserBox!.y).toBeLessThan(commentBox!.y);
        await page.screenshot({ path: 'test-results/worker-rating-result.png' });
    } finally {
        personDatabase(`BEGIN;
            SELECT id FROM persons WHERE id='${id}' FOR UPDATE;
            DELETE FROM person_views WHERE person_id='${id}';
            DELETE FROM person_ratings WHERE person_id='${id}';
            DELETE FROM person_rating_options WHERE person_id='${id}';
            DELETE FROM persons WHERE id='${id}';
            COMMIT;`);
    }
});

async function fixtureSession(page: Page, email: string, password: string) {
    process.loadEnvFile(path.resolve('../../.env'));
    const secret = process.env.PROJECT_INTERNAL_JWT_SECRET;
    if (!secret) {
        throw new Error('The local fixture requires the internal service secret');
    }
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'persons', sub: 'restriction-e2e', aud: 'persons-internal', scope: 'service', iat: now, exp: now + 120, jti: randomUUID() })}`;
    const token = `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
    const ip = `2001:db8:${randomBytes(8).toString('hex').match(/.{4}/g)!.join(':')}`;
    const api = new IdApi(
        new Configuration({
            basePath: ID_API,
            headers: {
                'X-Service-Authorization': `Bearer ${token}`,
                'X-Client-IP': ip,
                'X-Client-Browser': 'Restriction QA',
            },
        }),
    );
    const session = await api.createSession({ credentials: { email, password } });
    await page
        .context()
        .addCookies([{ name: 'PERSONS_SESSION', value: session.token, url: ID, httpOnly: true, sameSite: 'Lax' }]);
}

async function signIn(page: Page) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const account = JSON.parse(await readFile(path.resolve('../../.build/person-demo-account.json'), 'utf8')) as {
        email: string;
        password: string;
    };
    await fixtureSession(page, account.email, account.password);
    await page.goto(`${PERSON}/krel`);
    await expect(page).toHaveURL(/\/krel$/);
    return account;
}

test.afterEach(async ({ page, context, baseURL }) => {
    if ((await context.cookies()).some((item) => item.name === 'PERSONS_SESSION')) {
        await page.goto(`${baseURL}/ru`);
        await page.getByRole('button', { name: 'Аккаунт: Крел' }).click();
        await page.getByText('Выйти из устройства', { exact: true }).click();
        await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
    }
});

test('centers every header element and keeps grouped menu icons and the admin link', async ({ page }) => {
    await signIn(page);
    for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const button = page.getByRole('button', { name: 'Аккаунт: Крел' });
        const delta = await button.evaluate((element) => {
            const center = element.getBoundingClientRect();
            return Array.from(element.querySelectorAll('[class*="content"] > *')).map((child) => {
                const rect = child.getBoundingClientRect();
                return rect.height ? Math.abs(center.y + center.height / 2 - rect.y - rect.height / 2) : 0;
            });
        });
        expect(delta.length).toBeGreaterThan(1);
        expect(Math.max(...delta)).toBeLessThan(2);
        await button.click();
        const items = page.getByRole('menuitem');
        expect((await items.allTextContents()).filter(Boolean)).toEqual([
            'Моя страница',
            'Уведомления',
            'Мои сессии',
            'Язык',
            'Тема',
            'Смена пароля',
            'Смена почты',
            'Админка',
            'Выйти из устройства',
        ]);
        for (const text of ['Язык', 'Тема']) {
            await expect(
                items
                    .filter({ hasText: new RegExp(`^${text}$`) })
                    .locator('svg')
                    .first(),
            ).toBeVisible();
        }
        await expect(page.getByRole('menuitem', { name: 'Админка', exact: true })).toHaveAttribute(
            'href',
            /localhost:3001/,
        );
        await page.keyboard.press('Escape');
    }
});

test('shows an action ban on save with a police illustration, reason and end date', async ({ page, baseURL }) => {
    test.setTimeout(90000);
    const account = await signIn(page);
    const userId = DEMO_ACCOUNT_ID;
    const url = `${ADMIN}/api/person/v1/admin/users/${userId}/restriction`;
    const original = (await (await page.request.get(url)).json()).restriction;
    const reason = 'Проверка ограничения комментариев';
    try {
        const response = await page.request.put(url, {
            headers: { origin: ADMIN },
            data: { scopes: ['COMMENTS'], reason, expiresAt: new Date(Date.now() + 3600000).toISOString() },
        });
        expect(response.status()).toBe(200);
        await page.goto(`${baseURL}/krel`);
        await page.getByRole('textbox', { name: 'Ваша история', exact: true }).fill('Отправка должна быть запрещена');
        await page.getByRole('button', { name: 'Отправить', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Действие запрещено' });
        await expect(dialog.getByText(reason, { exact: true })).toBeVisible();
        await expect(dialog.getByRole('img')).toHaveAttribute('src', /restricted-vadim-v1/);
        await expect(dialog.getByText(/^Ограничение действует до/)).toBeVisible();
        await page.screenshot({ path: 'test-results/restriction-modal.png' });
        await dialog.getByRole('button', { name: 'Понятно' }).click();
        await page.goto(`${ADMIN}/ru?search=${encodeURIComponent(account.email)}`);
        await page.getByRole('button', { name: 'Блокировки', exact: true }).click();
        await expect(page.getByRole('textbox', { name: 'Причина ограничения' })).toHaveValue(reason);
        await expect(page.getByLabel('Действует до')).toHaveAttribute('type', 'datetime-local');
    } finally {
        if (original) {
            await page.request.put(url, { headers: { origin: ADMIN }, data: original });
        } else {
            const revoked = await page.request.delete(url, { headers: { origin: ADMIN } });
            expect(revoked.status()).toBe(204);
        }
    }
});

test('redirects a fully blocked account to its explanation on every profile visit', async ({
    page,
    browser,
    baseURL,
}) => {
    test.setTimeout(90000);
    const account = await signIn(page);
    const id = randomUUID();
    const email = `restriction-qa-${id}@example.test`;
    const database = (name: string, statement: string) =>
        execFileSync(
            'docker',
            ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'persons', '-d', name, '-v', 'ON_ERROR_STOP=1', '-qAt'],
            { cwd: path.resolve('../..'), input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
        );
    database(
        'id',
        `INSERT INTO accounts(id,email,first_name,last_name,locale,password_hash,failed_logins,created_at,version,role,status)
        SELECT '${id}','${email}','Проверка','Блокировки','ru',password_hash,0,now(),0,'USER','ACTIVE'
        FROM accounts WHERE email='demo@persons.local';`,
    );
    const isolated = await browser.newContext({ reducedMotion: 'reduce' });
    const visitor = await isolated.newPage();
    const url = `${ADMIN}/api/person/v1/admin/users/${id}/restriction`;
    try {
        await fixtureSession(visitor, email, account.password);
        await visitor.goto(`${baseURL}/krel`);
        await expect(visitor).toHaveURL(/\/krel$/);
        const ban = await page.request.put(url, {
            headers: { origin: ADMIN },
            data: { scopes: ['ACCOUNT'], reason: 'Полная тестовая блокировка' },
        });
        expect(ban.status()).toBe(200);
        for (const route of ['/krel', '/ru', '/vadim', '/not/a/real/page']) {
            try {
                await visitor.goto(`${baseURL}${route}`, { waitUntil: 'commit' });
            } catch (error) {
                // An in-flight API response may redirect the current document first.
                if (!(error instanceof Error) || !error.message.includes('net::ERR_ABORTED')) {
                    throw error;
                }
            }
            await expect(visitor).toHaveURL(/\/ru\/blocked$/);
            await expect(
                visitor.getByRole('main').getByText('Полная тестовая блокировка', { exact: true }),
            ).toBeVisible();
            await expect(visitor.getByRole('main').getByRole('img')).toHaveAttribute('src', /restricted-vadim-v1/);
        }
        await visitor.screenshot({ path: 'test-results/blocked-account.png' });
        const denied = await visitor.request.get(`${baseURL}/api/person/v1/persons/by-tag/krel`);
        expect(denied.status()).toBe(403);
        expect((await denied.json()).scope).toBe('ACCOUNT');
    } finally {
        await isolated.close();
        await page.request.delete(url, { headers: { origin: ADMIN } });
        database('person', `DELETE FROM account_restrictions WHERE user_id='${id}';`);
        database('id', `DELETE FROM sessions WHERE user_id='${id}'; DELETE FROM accounts WHERE id='${id}';`);
    }
});
