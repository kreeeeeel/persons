import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.E2E_MOCK_PREVIEW !== 'true', 'Requires scripts/start-community-preview.ps1');

async function settleScroll(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
    );
}

for (const route of ['person/krel?preview=integrations', 'feed']) {
    test(`match details lock the page, contain inner scrolling and restore it on close: ${route}`, async ({
        page,
        context,
        baseURL,
    }) => {
        const url = baseURL ?? 'http://localhost:3002';
        await context.addCookies([
            { name: 'PERSONS_OPTIONAL_COOKIES', value: 'rejected', url },
            { name: 'PERSONS_SESSION', value: 'local-community-preview', url },
        ]);
        await page.setViewportSize({ width: 390, height: 640 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`/ru/${route}`);
        if (route === 'feed') {
            await page.getByRole('combobox', { name: 'События в ленте' }).click();
            await page.getByRole('option', { name: 'Игры', exact: true }).click();
        }
        const card = page.getByRole('button', { name: /^Открыть матч: Juggernaut/ });
        await card.scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => {
            const main = document.querySelector('main')!.getBoundingClientRect();
            return { y: scrollY, x: main.x, width: main.width };
        });
        expect(before.y).toBeGreaterThan(0);
        await card.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const scrollArea = dialog.locator('.g-dialog');

        await page.mouse.move(5, 320);
        await page.mouse.wheel(0, 500);
        await settleScroll(page);
        expect(await page.evaluate(() => scrollY)).toBe(before.y);

        await dialog.hover();
        await page.mouse.wheel(0, 500);
        await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await page.mouse.wheel(0, 2000);
        await settleScroll(page);
        expect(await page.evaluate(() => scrollY)).toBe(before.y);
        const during = await page.locator('main').boundingBox();
        expect(during!.x).toBe(before.x);
        expect(during!.width).toBe(before.width);

        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(card).toBeFocused();
        expect(await page.evaluate(() => scrollY)).toBe(before.y);
        await page.mouse.move(195, 320);
        await page.mouse.wheel(0, -300);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before.y);
    });
}
