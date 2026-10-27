import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test.skip(
    process.env.E2E_REAL_PROFILE !== 'true',
    'Requires the real isolated local API and community review fixtures',
);
test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
});

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [390, 1440]) {
            for (const [tag, full] of [
                ['krel', false],
                ['slava', true],
            ] as const) {
                test(`public status ${locale} ${theme} ${width} ${tag}`, async ({ page, context, baseURL }) => {
                    await context.addCookies([
                        { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                    ]);
                    await page.emulateMedia({ reducedMotion: 'reduce' });
                    await page.setViewportSize({ width, height: 900 });
                    await page.goto(`/${locale}/person/${tag}`);
                    const notice = page.getByRole('region', {
                        name: locale === 'ru' ? 'Блокировка пользователя' : 'Account restriction',
                    });
                    await expect(notice).toHaveCount(1);
                    await expect(notice).toBeVisible();
                    const heading = page.getByRole('heading', { level: 1 });
                    const name = await heading.innerText();
                    await expect(notice).toContainText(
                        locale === 'ru' ? `Доступ у профиля ${name} ограничен` : `Access for ${name} is restricted`,
                    );
                    await expect(heading).toHaveCSS('text-decoration-line', full ? 'line-through' : 'none');
                    const profile = page.getByRole('complementary', {
                        name: locale === 'ru' ? 'Информация о человеке' : 'Person information',
                    });
                    const linked = profile.getByRole('link', {
                        name: locale === 'ru' ? /Привязанный профиль/ : /Linked profile/,
                    });
                    await expect(linked).toHaveAttribute('href', `/${locale}/publications/${tag}`);
                    await expect(
                        profile.getByRole('region', {
                            name:
                                locale === 'ru'
                                    ? full
                                        ? 'Пропал без вести'
                                        : 'Не отвечает'
                                    : full
                                      ? 'Missing'
                                      : 'Not responding',
                        }),
                    ).toBeVisible();
                    const info = notice.getByRole('button', {
                        name: locale === 'ru' ? 'Ограничения' : 'Restrictions',
                    });
                    await expect(info).toHaveCSS('--g-button-border-width', '0px');
                    await expect(info).toHaveCSS('--g-button-focus-outline-width', '0px');
                    await info.click();
                    await expect(
                        page.getByText(
                            locale === 'ru'
                                ? full
                                    ? 'Все действия на сайте'
                                    : 'Загрузка фото и видео'
                                : full
                                  ? 'All actions on the site'
                                  : 'Uploading photos and videos',
                            { exact: true },
                        ),
                    ).toBeVisible();
                    await page.keyboard.press('Escape');
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                    if (width === 1440) {
                        const box = await profile.boundingBox();
                        const ticker = await page.locator('[data-view="glass"]').boundingBox();
                        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan((ticker?.y ?? 900) - 8);
                    }
                    await page.screenshot({
                        path: `test-results/community-profile-${locale}-${theme}-${width}-${tag}.png`,
                    });
                });
            }
        }
    }
}

for (const width of [320, 390, 768, 1440]) {
    test(`editor keeps drafts across sections and fits the viewport ${width}`, async ({ page, context, baseURL }) => {
        const { token } = JSON.parse(await readFile(path.resolve('../../.cache/feature-session.json'), 'utf8'));
        await context.addCookies([{ name: 'PERSONS_SESSION', value: token, url: baseURL ?? 'http://localhost:3002' }]);
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/ru/person/krel');
        await page.getByRole('button', { name: 'Управление страницей', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Редактирование страницы', exact: true }).click();
        const editor = page.getByRole('dialog', { name: 'Редактирование персоны' });
        const select = async (name: string) => {
            if (width <= 760) {
                await editor.getByRole('combobox', { name: 'Разделы', exact: true }).click();
                await page.getByRole('option', { name, exact: true }).click();
            } else {
                await editor.getByRole('menuitem', { name, exact: true }).click();
            }
        };
        await select('Описание и теги');
        const draft = `Несохранённое описание ${width}`;
        await editor.getByRole('textbox', { name: 'Описание', exact: true }).fill(draft);
        await select('Армия');
        await expect(editor.getByLabel('Дата ухода в армию', { exact: true })).toBeVisible();
        await select('Пропал без вести');
        await expect(editor.getByRole('combobox', { name: 'Статус связи', exact: true })).toBeVisible();
        await select('Описание и теги');
        await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue(draft);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const box = await editor.boundingBox();
        expect(box?.x).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
        await page.screenshot({ path: `test-results/community-editor-${width}.png` });
        await page.keyboard.press('Escape');
        await expect(editor).toHaveCount(0);
    });
}

test('public author shows approved posts and tag meanings, while their own pending posts stay private', async ({
    page,
    browser,
    baseURL,
}) => {
    await page.goto('/ru/publications/krel');
    await expect(page.getByRole('heading', { name: 'Антон Тестов', exact: true })).toBeVisible();
    await expect(page.getByText('Публичная запись', { exact: false })).toBeVisible();
    await expect(page.getByText('Личная запись на модерации', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Значение тега #dota', exact: true }).click();
    await expect(page.getByText('Играем в Dota 2 вместе с друзьями.', { exact: true })).toBeVisible();
    const sessions = JSON.parse(await readFile(path.resolve('../../.cache/community-sessions.json'), 'utf8'));
    const context = await browser.newContext();
    try {
        await context.addCookies([
            { name: 'PERSONS_SESSION', value: sessions[0].token, url: baseURL ?? 'http://localhost:3002' },
            { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
        ]);
        const own = await context.newPage();
        await own.goto(`${baseURL ?? 'http://localhost:3002'}/ru/my-publications`);
        await expect(own.getByRole('heading', { name: 'Антон Тестов', exact: true })).toBeVisible();
        await expect(own.getByText('Личная запись на модерации', { exact: false })).toBeVisible();
        await expect(own.getByRole('link', { name: 'Антон Тестов', exact: true }).first()).toHaveAttribute(
            'href',
            '/ru/publications/krel',
        );
    } finally {
        await context.close();
    }
});

test('CMS saves real glossary definitions and the public tag displays the updated meaning', async ({
    page,
    context,
    baseURL,
}) => {
    const { token } = JSON.parse(await readFile(path.resolve('../../.cache/feature-session.json'), 'utf8'));
    await context.addCookies([{ name: 'PERSONS_SESSION', value: token, url: baseURL ?? 'http://localhost:3002' }]);
    const admin = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';
    const original = await (await page.request.get(`${admin}/api/person/v1/tag-definitions`)).json();
    try {
        await page.goto(`${admin}/ru/tag-dictionary`);
        const meaning = 'Обновлённое значение для проверки справочника.';
        await page.getByRole('textbox', { name: 'Описание на русском', exact: true }).first().fill(meaning);
        await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
        await expect(page.getByText('Справочник сохранён', { exact: true })).toBeVisible();
        await page.goto(`${baseURL ?? 'http://localhost:3002'}/ru/publications/krel`);
        await page.getByRole('button', { name: 'Значение тега #dota', exact: true }).click();
        await expect(page.getByText(meaning, { exact: true })).toBeVisible();
    } finally {
        const restore = await page.request.put(`${admin}/api/person/v1/admin/tag-definitions`, {
            headers: { Origin: admin },
            data: original,
        });
        expect(restore.ok()).toBe(true);
    }
});

test('editor opens the original avatar and account dialogs and preserves unsaved description', async ({
    page,
    context,
    baseURL,
}) => {
    const { token } = JSON.parse(await readFile(path.resolve('../../.cache/feature-session.json'), 'utf8'));
    await context.addCookies([{ name: 'PERSONS_SESSION', value: token, url: baseURL ?? 'http://localhost:3002' }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ru/person/krel');
    await page.getByRole('button', { name: 'Управление страницей', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Редактирование страницы', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Редактирование персоны', exact: true });
    await editor.getByRole('menuitem', { name: 'Описание и теги', exact: true }).click();
    await editor.getByRole('textbox', { name: 'Описание', exact: true }).fill('Описание до открытия аватара');
    await editor.getByRole('menuitem', { name: 'Аватар', exact: true }).click();
    await editor.getByRole('button', { name: 'Изменить аватар', exact: true }).click();
    const avatar = page.getByRole('dialog', { name: 'Аватар', exact: true });
    await expect(avatar).toBeVisible();
    await expect(avatar.locator('input[type=file]')).toHaveCount(1);
    await avatar.getByRole('button', { name: 'Отмена', exact: true }).click();
    await editor.getByRole('menuitem', { name: 'Привязка аккаунта', exact: true }).click();
    await editor.getByRole('button', { name: 'Привязка аккаунта', exact: true }).click();
    const account = page.getByRole('dialog', { name: 'Привязка аккаунта', exact: true });
    await expect(account.getByRole('textbox', { name: 'Почта аккаунта', exact: true })).toBeVisible();
    await account.getByRole('button', { name: 'Отмена', exact: true }).click();
    await editor.getByRole('menuitem', { name: 'Описание и теги', exact: true }).click();
    await expect(editor.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue(
        'Описание до открытия аватара',
    );
    await editor.getByRole('button', { name: 'Отмена', exact: true }).click();
});
