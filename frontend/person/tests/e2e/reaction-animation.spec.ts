import { expect, test } from '@playwright/test';

test('animates reaction lists gently and respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/krel');
    await page.getByRole('tab', { name: /Фотографии/ }).click();
    await page.getByRole('button', { name: 'Тот самый человек из нашей компании', exact: true }).click();
    const viewer = page.getByRole('dialog', { name: 'Просмотр медиа' });
    const count = viewer.getByRole('button', { name: /Кому понравилось:/ }).first();
    await count.hover();
    const voters = page.getByRole('dialog', { name: 'Кому понравилось', exact: true });
    await expect(voters).toBeVisible();
    expect(await voters.evaluate((element) => getComputedStyle(element.parentElement!).animationDuration)).toBe(
        '0.32s',
    );
    await voters.hover();
    await page.keyboard.press('Escape');
    await expect(voters).toHaveCount(0);
    await expect(viewer).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await count.hover();
    await expect(voters).toBeVisible();
    expect(await voters.evaluate((element) => getComputedStyle(element.parentElement!).animationName)).toBe('none');
    await page.screenshot({ path: 'test-results/reaction-dropdown.png' });
});
