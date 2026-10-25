import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const MAX_TEST_WORKERS = 4;

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'src'),
            '@test': path.resolve(import.meta.dirname, 'tests'),
        },
    },
    test: {
        maxWorkers: MAX_TEST_WORKERS,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', '../libs/**/*.test.{ts,tsx}'],
        server: { deps: { inline: [/@gravity-ui\//] } },
    },
});
