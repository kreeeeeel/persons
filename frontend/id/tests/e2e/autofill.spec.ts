import { expect, test } from '@playwright/test';

const PERSONS_THEME = 'PERSONS_THEME';
const X_60 = 60;
const Y_8 = 8;
const WIDTH_20 = 20;
const HEIGHT_16 = 16;
const NAME_FIRST = 'NAME_FIRST';
const NAME_LAST = 'NAME_LAST';
const EMAIL_ADDRESS = 'EMAIL_ADDRESS';

for (const theme of ['light', 'dark']) {
    test(`browser autofill preserves field backgrounds and readable text in ${theme} theme`, async ({
        page,
        context,
        baseURL,
    }) => {
        await context.addCookies([{ name: PERSONS_THEME, value: theme, url: baseURL ?? 'http://127.0.0.1:3200' }]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/ru');
        await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();

        const input = page.getByLabel('Имя', { exact: true });

        await expect(input).toBeVisible();
        await page.evaluate(() => document.fonts.ready);

        const bounds = await input.boundingBox();

        if (!bounds) {
            throw new Error('Autofill field unavailable');
        }

        const clip = {
            x: bounds.x + bounds.width - X_60,
            y: bounds.y + Y_8,
            width: WIDTH_20,
            height: bounds.height - HEIGHT_16,
        };
        const background = await page.screenshot({ clip, animations: 'disabled' });

        const cdp = await context.newCDPSession(page);

        try {
            await cdp.send('Autofill.enable');

            const { root } = await cdp.send('DOM.getDocument');
            const { nodeId } = await cdp.send('DOM.querySelector', {
                nodeId: root.nodeId,
                selector: 'input#firstName',
            });
            const { node } = await cdp.send('DOM.describeNode', { nodeId });

            await cdp.send('Autofill.trigger', {
                fieldId: node.backendNodeId,
                address: {
                    fields: [
                        { name: NAME_FIRST, value: 'Анна' },
                        { name: NAME_LAST, value: 'Иванова' },
                        { name: EMAIL_ADDRESS, value: 'autofill@example.test' },
                    ],
                },
            });
            await expect(input).toHaveValue('Анна');
            await expect(page.getByLabel('Фамилия', { exact: true })).toHaveValue('Иванова');
            expect(await input.evaluate((element) => element.matches(':autofill'))).toBe(true);
            expect(await input.evaluate((element) => getComputedStyle(element).backgroundClip)).toBe('text');
            expect(
                await input.evaluate((element) => {
                    const style = getComputedStyle(element);
                    const label = document.querySelector('label[for="firstName"]');

                    return label && style.webkitTextFillColor === getComputedStyle(label).color;
                }),
            ).toBe(true);
            expect(await page.screenshot({ clip, animations: 'disabled' })).toEqual(background);
            await page.screenshot({
                path: `.build/screenshots/autofill-${theme}.png`,
                animations: 'disabled',
            });
        } finally {
            await cdp.detach();
        }
    });
}
