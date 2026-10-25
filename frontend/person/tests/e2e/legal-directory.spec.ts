import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_MOCK_PREVIEW !== 'true', 'Requires scripts/start-community-preview.ps1');

for (const locale of ['ru', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
        for (const width of [390, 1440]) {
            test(`legal pages and directory: ${locale}, ${theme}, ${width}`, async ({ page, context, baseURL }) => {
                await context.addCookies([
                    { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
                    { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
                ]);
                await page.setViewportSize({ width, height: 1000 });
                await page.emulateMedia({ reducedMotion: 'reduce' });
                for (const route of ['privacy', 'terms', 'people']) {
                    await page.goto(`/${locale}/${route}`);
                    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
                    await expect(page.getByRole('banner')).toBeVisible();
                    await expect(
                        page.getByRole('banner').getByRole('button', { name: /^(Язык|Language)$/ }),
                    ).toHaveCount(0);
                    await expect(
                        page.getByText(/Проект для согласования|Предпросмотр|Draft for review|Sample profiles/),
                    ).toHaveCount(0);
                    if (route === 'people') {
                        await expect(page.getByRole('search')).toHaveCount(1);
                        await expect(page.getByRole('combobox')).toHaveCount(2);
                        await expect(
                            page.getByRole('heading', { name: locale === 'ru' ? 'Крел' : 'Krel', exact: true }),
                        ).toBeVisible();
                        await expect(page.getByRole('checkbox')).toHaveCount(0);
                        const last = page.getByRole('heading', {
                            name: locale === 'ru' ? 'Стёпа' : 'Stepa',
                            exact: true,
                        });
                        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                        await expect(last).toBeVisible();
                        await page
                            .getByRole('combobox', { name: locale === 'ru' ? 'Сначала показывать' : 'Show first' })
                            .click();
                        await page
                            .getByRole('option', { name: locale === 'ru' ? 'По имени' : 'By name', exact: true })
                            .click();
                        await expect(
                            page.getByRole('heading', { name: locale === 'ru' ? 'Артём' : 'Artem', exact: true }),
                        ).toBeVisible();
                        await page.evaluate(() => window.scrollTo(0, 0));
                    }
                    await page.evaluate(() => document.fonts.ready);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                    await page.screenshot({
                        path: `test-results/community-${route}-${locale}-${theme}-${width}.png`,
                        fullPage: false,
                    });
                }
            });
        }
    }
}

test('privacy hover and document-local language picker', async ({ page }) => {
    await page.goto('/ru/privacy');
    await expect(page.getByRole('heading', { name: 'Политика конфиденциальности', exact: true })).toBeVisible();
    const privacy = page.getByRole('banner').getByRole('link', { name: 'Конфиденциальность', exact: true });
    await privacy.hover();
    await expect
        .poll(() => privacy.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe('rgba(0, 0, 0, 0)');
    await page.getByRole('button', { name: 'Язык', exact: true }).click();
    await page.getByText('English', { exact: true }).click();
    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Privacy policy', exact: true })).toBeVisible();
});

test('editing contact details in admin updates an already open policy', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const publicContext = await browser.newContext({ baseURL: 'http://localhost:3002' });
    const admin = await adminContext.newPage();
    const policy = await publicContext.newPage();
    try {
        await admin.goto('http://localhost:4310/session');
        await expect(admin.getByRole('heading', { name: 'Переменные', exact: true })).toBeVisible();
        await expect(admin.getByRole('button', { name: 'Изменить: Почта для обращений', exact: true })).toBeVisible({
            timeout: 15000,
        });
        await admin.screenshot({ path: 'test-results/community-variables.png', fullPage: false });
        await policy.goto('/ru/privacy');
        await expect(policy.getByRole('link', { name: 'privacy@example.test', exact: true })).toHaveCount(1);
        await admin.getByRole('button', { name: 'Изменить: Почта для обращений', exact: true }).click();
        await admin.getByRole('dialog').getByRole('textbox', { name: 'Значение' }).fill('review@example.test');
        await admin.getByRole('button', { name: 'Сохранить', exact: true }).click();
        await expect(admin.getByText('Переменная сохранена', { exact: true })).toBeVisible();
        await policy.bringToFront();
        await expect(policy.getByRole('link', { name: 'review@example.test', exact: true })).toHaveCount(1, {
            timeout: 20000,
        });
    } finally {
        const response = await admin.request.get('http://localhost:4310/v1/admin/variables', {
            headers: { Authorization: 'Bearer local-community-preview' },
        });
        const variables = (await response.json()) as { key: string; revision: number }[];
        const email = variables.find((variable) => variable.key === 'legal.supportEmail');
        if (email) {
            await admin.request.put('http://localhost:4310/v1/admin/variables/legal.supportEmail', {
                headers: { Authorization: 'Bearer local-community-preview' },
                data: { value: '"privacy@example.test"', revision: email.revision },
            });
        }
        await adminContext.close();
        await publicContext.close();
    }
});

test('JSON values are hidden in the table, viewable read-only and editable with validation', async ({ page }) => {
    await page.goto('http://localhost:4310/session');
    await expect(page.getByRole('button', { name: 'Посмотреть: Сведения об операторе по языкам' })).toBeVisible();
    await expect(page.getByRole('table')).not.toContainText('Сервис «Те ещё люди»');
    await page.getByRole('button', { name: 'Посмотреть: Сведения об операторе по языкам' }).click();
    const value = page.getByRole('dialog').getByRole('textbox', { name: 'Значение' });
    await expect(value).toHaveAttribute('aria-readonly', 'true');
    await expect(value).toContainText('Сервис «Те ещё люди»');
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await page.getByRole('button', { name: 'Изменить: Сведения об операторе по языкам' }).click();
    const editor = page.getByRole('dialog').getByRole('textbox', { name: 'Значение' });
    await editor.fill('{"ru":');
    await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
    await editor.fill('{"ru":"Проверка","en":"Review"}');
    await page.getByRole('button', { name: 'Форматировать JSON' }).click();
    await expect(editor).toContainText('Review');
    await expect(editor.locator('span')).not.toHaveCount(0);
    await page.screenshot({ path: 'test-results/community-json-editor.png' });
    const cancel = await page.getByRole('button', { name: 'Отмена', exact: true }).boundingBox();
    const save = await page.getByRole('button', { name: 'Сохранить', exact: true }).boundingBox();
    expect((save?.x ?? 0) - ((cancel?.x ?? 0) + (cancel?.width ?? 0))).toBeGreaterThanOrEqual(12);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Переменная сохранена', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Посмотреть: Сведения об операторе по языкам' }).click();
    await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Значение' })).toContainText('Review');
    const response = await page.request.get('http://localhost:4310/v1/admin/variables', {
        headers: { Authorization: 'Bearer local-community-preview' },
    });
    const properties = (await response.json()) as { key: string; revision: number }[];
    const operator = properties.find((property) => property.key === 'legal.operatorNames');
    if (operator) {
        await page.request.put('http://localhost:4310/v1/admin/variables/legal.operatorNames', {
            headers: { Authorization: 'Bearer local-community-preview' },
            data: {
                revision: operator.revision,
                value: JSON.stringify({ ru: 'Сервис «Те ещё люди»', en: 'Те ещё люди service' }),
            },
        });
    }
});

test('JSON editor follows the dark theme in English and fits a mobile dialog', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'PERSONS_THEME', value: 'dark', url: 'http://localhost:3001' }]);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('http://localhost:4310/session?locale=en');
    await page.getByRole('button', { name: 'Edit: Localized operator details' }).click();
    const editor = page.getByRole('dialog').getByRole('textbox', { name: 'Value' });
    await expect(editor).toContainText('Те ещё люди service');
    await expect(page.locator('[data-floating-ui-status="open"]')).toHaveCSS('opacity', '1');
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/community-json-dark-mobile.png' });
});

test('cookie refusal persists, leaves the site usable and can be changed', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/ru/people');
    const notice = page.getByRole('region', { name: 'Настройки cookie' });
    await expect(notice).toBeVisible();
    const image = notice.getByRole('img');
    await expect(image).toBeVisible();
    expect((await notice.boundingBox())?.height ?? 1000).toBeLessThan(144);
    const reject = notice.getByRole('button', { name: 'Не согласен', exact: true });
    await page.mouse.move(0, 0);
    expect(await reject.evaluate((element) => getComputedStyle(element, '::before').backgroundColor)).toBe(
        'rgba(0, 0, 0, 0)',
    );
    await reject.hover();
    await expect
        .poll(() => reject.evaluate((element) => getComputedStyle(element, '::before').backgroundColor))
        .not.toBe('rgba(0, 0, 0, 0)');
    await expect(reject).toHaveCSS('height', '36px');
    await expect(reject).toHaveCSS('line-height', '36px');
    expect(await reject.evaluate((element) => getComputedStyle(element, '::before').borderRadius)).toBe('999px');
    await page.screenshot({ path: 'test-results/community-cookie-notice.png' });
    await notice.getByRole('button', { name: 'Не согласен', exact: true }).click();
    await expect(notice).toHaveCount(0);
    expect((await context.cookies()).find((cookie) => cookie.name === 'PERSONS_OPTIONAL_COOKIES')?.value).toBe(
        'rejected',
    );
    await page.reload();
    await expect(notice).toHaveCount(0);
    await page.goto('/ru/privacy#cookies');
    await page.getByRole('button', { name: 'Изменить выбор cookie' }).click();
    await expect(notice).toBeVisible();
    await notice.getByRole('button', { name: 'Согласен', exact: true }).click();
    await expect(notice).toHaveCount(0);
    expect((await context.cookies()).find((cookie) => cookie.name === 'PERSONS_OPTIONAL_COOKIES')?.value).toBe(
        'accepted',
    );
});

test('directory cards scale and change color on hover and navigate from the card body', async ({ page, context }) => {
    await context.addCookies([{ name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: 'http://localhost:3002' }]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/ru/people');
    const link = page.getByRole('link', { name: 'Открыть карточку: Крел' });
    const card = link.locator(':scope > div');
    await expect(link).toHaveAttribute('href', '/ru/person/krel');
    const background = await card.evaluate((element) => getComputedStyle(element).backgroundColor);
    await link.hover();
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(background);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(card).toHaveCSS('transform', 'none');
    await link.click({ position: { x: 36, y: 120 } });
    await expect(page).toHaveURL(/\/ru\/person\/krel$/);
    await expect(page.getByRole('heading', { name: 'Крел', exact: true })).toBeVisible();
});

test('variables reuse the shared table spacing and open the editor from any row cell', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:4310/session');
    const region = page.getByRole('region', { name: 'Переменные' });
    await expect(region).toHaveCSS('border-radius', '16px');
    const table = region.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Действия', exact: true })).toHaveCount(0);
    await expect(table.getByText('Изменить', { exact: true })).toHaveCount(0);
    const row = table.getByRole('row').filter({ hasText: 'legal.supportEmail' });
    const cells = row.getByRole('cell');
    await expect(cells.first()).toHaveCSS('padding-left', '24px');
    await expect(cells.last()).toHaveCSS('padding-right', '24px');
    await expect(row).toHaveCSS('cursor', 'pointer');
    const color = await row.evaluate((element) => getComputedStyle(element).backgroundColor);
    await row.hover();
    await expect.poll(() => row.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(color);
    await row.getByRole('cell', { name: 'STRING', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Значение' })).toHaveValue(
        'privacy@example.test',
    );
    await page.screenshot({ path: 'test-results/community-variable-row.png' });
});

test('legal navigation reveals its scrollbar on hover', async ({ page, context }) => {
    await context.addCookies([{ name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: 'http://localhost:3002' }]);
    await page.setViewportSize({ width: 1440, height: 650 });
    await page.goto('/ru/terms');
    const sidebar = page.getByRole('complementary');
    await page.mouse.move(0, 0);
    expect(
        await sidebar.evaluate((element) =>
            getComputedStyle(element).getPropertyValue('--legal-scrollbar-thumb').trim(),
        ),
    ).toBe('transparent');
    await sidebar.hover();
    await expect
        .poll(() =>
            sidebar.evaluate((element) => getComputedStyle(element).getPropertyValue('--legal-scrollbar-thumb').trim()),
        )
        .not.toBe('transparent');
});

test('keeps header, cards and cookie notice inside a 320px mobile viewport', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto('/ru/people');
    await expect(page.getByRole('heading', { name: 'Крел', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Настройки cookie' })).toBeVisible();
    const notice = page.getByRole('region', { name: 'Настройки cookie' });
    const art = await notice.getByRole('img').boundingBox();
    const title = await notice.getByRole('heading').boundingBox();
    expect((art?.x ?? 0) + (art?.width ?? 0)).toBeLessThanOrEqual(title?.x ?? 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/community-cookie-mobile.png' });
});

test('ID registration requires acceptance and opens localized terms', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:3000/ru');
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'политике конфиденциальности', exact: true })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/community-registration.png', fullPage: true });
    const popup = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'условия пользования', exact: true }).click();
    const document = await popup;
    await expect(document.getByRole('heading', { name: 'Условия пользования', exact: true })).toBeVisible();
    await document.close();
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toBeEnabled();
});
