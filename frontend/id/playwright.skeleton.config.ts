import { defineConfig, devices } from '@playwright/test';

const NO_RETRIES = 0;
const TIMEOUT_30000 = 30000;

export default defineConfig({
    testDir: './tests/skeleton-e2e',
    testMatch: 'skeleton-layout.spec.ts',
    retries: NO_RETRIES,
    outputDir: './test-results/skeleton',
    use: { baseURL: 'http://127.0.0.1:3403', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' },
        },
    ],
    webServer: {
        command: 'node node_modules/vite/bin/vite.js --config tests/e2e/skeleton-fixtures/vite.config.ts',
        url: 'http://127.0.0.1:3403',
        reuseExistingServer: false,
        timeout: TIMEOUT_30000,
    },
});
