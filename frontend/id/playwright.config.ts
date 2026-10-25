import { defineConfig, devices } from '@playwright/test';

const CI_RETRY_COUNT = 1;
const NO_RETRIES = 0;
const TEST_TIMEOUT_MILLIS = 60000;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? CI_RETRY_COUNT : NO_RETRIES,
    reporter: 'list',
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3200',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chromium',
            },
        },
    ],
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : {
              command: 'npm run start:testing',
              url: 'http://127.0.0.1:3200/api/health',
              reuseExistingServer: !process.env.CI,
              timeout: TEST_TIMEOUT_MILLIS,
              env: {
                  PORT: '3200',
                  ID_BASE_URL: 'http://127.0.0.1:18081',
                  I18N_BASE_URL: 'http://127.0.0.1:18082',
                  ASSET_BASE_URL: 'http://127.0.0.1:9000/persons/assets',
                  PUBLIC_URL: 'http://127.0.0.1:3200',
                  ADMIN_PUBLIC_URL: 'http://localhost:3001',
                  PERSON_PUBLIC_URL: 'http://localhost:3002',
                  PROJECT_INTERNAL_JWT_SECRET: 'local-development-internal-jwt-secret-change-before-deploy',
              },
          },
});
