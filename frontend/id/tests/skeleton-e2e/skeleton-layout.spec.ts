import { expect, test } from '@playwright/test';

const TO_BE_0 = 0;
const WIDTH_1440 = 1440;
const HEIGHT_900 = 900;
const WIDTH_390 = 390;
const HEIGHT_844 = 844;
const WIDTH_667 = 667;
const HEIGHT_375 = 375;

test('keeps the skeleton visible when loading is handed over to another boundary', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?pending=true&locale=ru&theme=light');
    for (const reload of [false, true]) {
        if (reload) {
            await page.reload();
        }

        const skeleton = page.locator('main [role="status"][aria-busy="true"]');

        await expect(skeleton).toBeVisible();
        expect(
            await skeleton.evaluate(
                (element) =>
                    element
                        .getAnimations({ subtree: true })
                        .filter(
                            (animation) =>
                                animation instanceof CSSAnimation && animation.animationName.includes('stageEnter'),
                        ).length,
            ),
        ).toBe(TO_BE_0);
    }
});

for (const viewport of [
    { width: WIDTH_1440, height: HEIGHT_900 },
    { width: WIDTH_390, height: HEIGHT_844 },
    { width: WIDTH_667, height: HEIGHT_375 },
]) {
    for (const locale of ['ru', 'en']) {
        for (const theme of ['light', 'dark']) {
            test(`identity loading ${viewport.width}, ${locale}, ${theme}`, async ({ page }) => {
                await page.setViewportSize(viewport);
                for (const recovery of [false, true]) {
                    const positions = [];

                    for (const pending of [true, false]) {
                        await page.goto(`/?pending=${pending}&locale=${locale}&theme=${theme}&recovery=${recovery}`);
                        await expect(page.getByRole('main')).toBeVisible();
                        await page.evaluate(() => document.fonts.ready);

                        if (!pending) {
                            await expect(
                                page.getByRole('textbox', {
                                    name: locale === 'ru' ? 'Электронная почта' : 'Email address',
                                }),
                            ).toBeVisible();
                        }

                        positions.push(
                            await page.getByRole('main').evaluate((main) => {
                                const content = main.firstElementChild!;
                                const form =
                                    content.querySelector('form') ?? content.querySelector('[class*="_form_"]')!;
                                const fields = form.querySelector('[class*="_fields_"]')!;
                                const rect = (element: Element) => {
                                    const box = element.getBoundingClientRect();

                                    return { x: box.x, y: box.y, width: box.width, height: box.height };
                                };

                                return {
                                    form: rect(form),
                                    fields: rect(fields),
                                    scrollWidth: document.documentElement.scrollWidth,
                                    scrollHeight: document.documentElement.scrollHeight,
                                };
                            }),
                        );
                    }

                    const [loading, ready] = positions;

                    expect(loading.scrollWidth).toBeLessThanOrEqual(viewport.width);
                    expect(loading.scrollHeight).toBeLessThanOrEqual(viewport.height);
                    expect(ready.scrollWidth).toBeLessThanOrEqual(viewport.width);
                    expect(ready.scrollHeight).toBeLessThanOrEqual(viewport.height);
                    expect(loading.form).toEqual(ready.form);
                    expect(loading.fields).toEqual(ready.fields);
                }
            });
        }
    }
}
