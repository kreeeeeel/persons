import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_MOCK_PREVIEW !== 'true', 'Requires scripts/start-community-preview.ps1');

for (const [locale, theme, width] of [
    ['ru', 'light', 1440],
    ['en', 'dark', 1440],
    ['ru', 'dark', 320],
    ['en', 'light', 390],
] as const) {
    test(`Leetify history and details: ${locale}, ${theme}, ${width}`, async ({ page, context, baseURL }) => {
        await context.addCookies([
            { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
            { name: 'PERSONS_THEME', value: theme, url: baseURL ?? 'http://localhost:3002' },
        ]);
        await page.setViewportSize({ width, height: 1100 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
            // The existing shared AppLink uses Next's deprecated legacyBehavior prop.
            const legacyLinkWarning = message.text().startsWith('`legacyBehavior` is deprecated');
            if (message.type() === 'error' && !legacyLinkWarning) {
                errors.push(message.text());
            }
        });
        await page.goto(`/${locale}/person/krel?preview=integrations`);
        await page.getByRole('tab', { name: 'Leetify', exact: true }).click();
        const card = page.getByRole('button', { name: /Mirage/ }).first();
        await expect(card).toBeVisible();
        const score = card.getByLabel(locale === 'ru' ? 'Счёт карты' : 'Map score');
        const outcome = card.getByText(locale === 'ru' ? 'Победа' : 'Victory', { exact: true });
        const separator = card.getByText('·', { exact: true });
        await expect(score).toHaveText('13:9');
        await expect(card.getByText(locale === 'ru' ? 'Победа · 13:9' : 'Victory · 13:9')).toBeVisible();
        await expect(outcome).toHaveCSS('font-size', width === 1440 ? '18px' : '16px');
        await expect(score).toHaveCSS('font-size', width === 1440 ? '18px' : '16px');
        expect(await outcome.evaluate((el) => getComputedStyle(el).color)).not.toBe(
            await score.evaluate((el) => getComputedStyle(el).color),
        );
        expect(await separator.evaluate((el) => getComputedStyle(el).color)).toBe(
            await card.evaluate((el) => getComputedStyle(el).color),
        );
        await expect(page.getByText('2462 ELO', { exact: true })).toBeVisible();
        const wingman = page.getByRole('button', { name: /Nuke/ }).first();
        await expect(wingman.locator('img[src$="/ranks/wingman-16.png"]')).toBeVisible();
        await card.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/leetify-${locale}-${theme}-${width}.png` });
        await card.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Mirage' })).toBeVisible();
        await expect(dialog.getByText(locale === 'ru' ? 'Победа · 13:9' : 'Victory · 13:9')).toBeVisible();
        const dialogScore = dialog.getByLabel(locale === 'ru' ? 'Счёт карты' : 'Map score');
        expect(await dialogScore.evaluate((el) => getComputedStyle(el).color)).toBe(
            await score.evaluate((el) => getComputedStyle(el).color),
        );
        expect(await dialog.getByText('·', { exact: true }).evaluate((el) => getComputedStyle(el).color)).toBe(
            await dialog.getByRole('heading', { name: 'Mirage' }).evaluate((el) => getComputedStyle(el).color),
        );
        await expect(dialog.getByText('35:34', { exact: true })).toBeVisible();
        await expect(dialog.getByText(locale === 'ru' ? '58,33%' : '58.33%')).toBeVisible();
        const performance = dialog.getByText(locale === 'ru' ? '+4,20' : '+4.20', { exact: true });
        await expect(performance).toBeVisible();
        await expect(dialog.locator('.g-label').filter({ hasText: locale === 'ru' ? '+4,20' : '+4.20' })).toHaveCSS(
            'background-color',
            'rgb(156, 204, 114)',
        );
        await expect(
            dialog.getByRole('link', { name: locale === 'ru' ? 'Открыть матч на Leetify' : 'View match on Leetify' }),
        ).toHaveAttribute('target', '_blank');
        await expect
            .poll(() =>
                dialog
                    .locator('img')
                    .evaluateAll((images) =>
                        images.every((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0),
                    ),
            )
            .toBe(true);
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: `test-results/leetify-dialog-${locale}-${theme}-${width}.png` });
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(card).toBeFocused();
        await page
            .getByRole('button', { name: /Inferno/ })
            .first()
            .click();
        await expect(page.getByRole('dialog').getByRole('img', { name: /FACEIT.*9/ })).toBeVisible();
        await expect(page.getByRole('dialog').getByRole('img', { name: /FACEIT.*9/ })).toHaveAttribute(
            'src',
            '/assets/integrations/leetify/ranks/faceit-9.png',
        );
        await expect(page.getByRole('dialog').getByText('2462', { exact: true })).toBeVisible();
        await expect(page.getByRole('dialog').getByText(/ELO/)).toHaveCount(0);
        expect(errors).toEqual([]);
    });
}

test('Leetify retries a failed request and shows the SAS empty state', async ({ page, context, baseURL }) => {
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
    let requests = 0;
    await page.route('**/api/person/v1/persons/*/games/cs2/matches*', (route) => {
        requests += 1;
        return requests === 1
            ? route.fulfill({ status: 503, json: { code: 'UNAVAILABLE' } })
            : route.fulfill({ json: { items: [], page: 0, size: 12, total: 0 } });
    });
    await page.goto('/ru/person/krel?preview=integrations');
    await page.getByRole('tab', { name: 'Leetify', exact: true }).click();
    await page.getByRole('button', { name: 'Попробовать ещё раз' }).click();
    await expect(page.getByText('Вадим, видимо, больше не зовёт апать кейс.')).toBeVisible();
    const art = page.getByRole('img', { name: /SAS/ });
    await expect(art).toHaveAttribute('src', '/media/empty-cs-sas-vadim-v2.webp');
    await expect
        .poll(() => art.evaluate((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0))
        .toBe(true);
    await art.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/leetify-empty.png' });
    expect(requests).toBe(2);
});

test('loads the next history page and reuses CS match details in the feed', async ({ page, context, baseURL }) => {
    await context.addCookies([
        { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url: baseURL ?? 'http://localhost:3002' },
    ]);
    await page.goto('/ru/person/krel?preview=integrations');
    await page.getByRole('tab', { name: 'Leetify', exact: true }).click();
    const cards = page.getByRole('button', { name: /^Открыть матч:/ });
    await expect(cards).toHaveCount(12);
    await page.getByRole('link', { name: 'Data Provided by Leetify' }).scrollIntoViewIfNeeded();
    await expect(cards).toHaveCount(18);
    await page.goto('http://localhost:4310/session');
    await page.goto('/ru/feed');
    await page.getByRole('combobox', { name: 'События в ленте' }).click();
    await page.getByRole('option', { name: 'Игры', exact: true }).click();
    const event = page.getByRole('article').filter({ hasText: 'Counter-Strike 2' }).first();
    await expect(event).toBeVisible();
    await expect(event.locator('img[src$="cs2-logo.svg"]')).toBeVisible();
    await event.getByRole('button', { name: /Mirage/ }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Mirage' })).toBeVisible();
});
