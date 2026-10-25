import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    workers: 1,
    reporter: 'list',
    timeout: 45000,
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3002',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' },
        },
    ],
});
