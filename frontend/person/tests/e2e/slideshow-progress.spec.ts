import { expect, test } from '@playwright/test';

test('fills the active slide smoothly, freezes on pause and search, and resets on the next slide', async ({ page }) => {
    await page.goto('/ru');
    const slideshow = page.getByRole('region', { name: 'Истории нашей компании' });
    await expect(slideshow).toHaveAttribute('aria-busy', 'false');
    const active = () =>
        page.getByRole('group', { name: 'Управление слайдами' }).locator('button[aria-pressed="true"]');
    const fill = () => active().locator('[style*="animation-duration"]');
    const scale = () => fill().evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
    await expect(fill()).toHaveCSS('animation-duration', '9s');
    await expect.poll(scale).toBeGreaterThan(0.04);
    expect(await scale()).toBeLessThan(0.8);
    await page.getByRole('button', { name: 'Остановить слайд-шоу' }).click();
    await expect(fill()).toHaveCSS('animation-play-state', 'paused');
    const paused = await scale();
    await page.waitForTimeout(500);
    expect(await scale()).toBeCloseTo(paused, 2);
    await page.getByRole('button', { name: 'Продолжить слайд-шоу' }).click();
    await expect.poll(scale).toBeGreaterThan(paused + 0.02);
    await page.getByRole('combobox').focus();
    await expect(fill()).toHaveCSS('animation-play-state', 'paused');
    const focused = await scale();
    await page.waitForTimeout(400);
    expect(await scale()).toBeCloseTo(focused, 2);
    await page.getByRole('heading').click();
    const previous = await active().getAttribute('aria-label');
    await expect.poll(() => active().getAttribute('aria-label'), { timeout: 12000 }).not.toBe(previous);
    expect(await scale()).toBeLessThan(0.3);
    await page.screenshot({ path: 'test-results/slideshow-progress.png' });
});

test('keeps progress and navigation static when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ru');
    const controls = page.getByRole('group', { name: 'Управление слайдами' });
    await expect(controls.getByRole('button', { name: 'Остановить слайд-шоу' })).toHaveCount(0);
    await expect(controls.locator('[style*="animation-duration"]')).toHaveCSS('animation-name', 'none');
    await controls.getByRole('button', { name: 'Иллюстрация 3 из 8' }).click();
    await expect(controls.getByRole('button', { name: 'Иллюстрация 3 из 8' })).toHaveAttribute('aria-pressed', 'true');
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
});
