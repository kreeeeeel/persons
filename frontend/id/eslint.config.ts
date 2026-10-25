import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const rawHtml = {
    selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/]",
    message: 'Compose UI with Gravity UI components.',
};
const literalText = {
    selector: 'JSXText[value=/[a-zA-ZА-Яа-я]/]',
    message: 'Use translated UI strings.',
};

export default defineConfig([
    ...nextVitals,
    ...nextTypescript,
    {
        ignores: [
            '.next/**',
            '**/build/**',
            '**/.build/**',
            '**/dist/**',
            '**/node_modules/**',
            'playwright-report/**',
            'test-results/**',
        ],
    },
    {
        settings: { next: { rootDir: '.' } },
        rules: {
            curly: ['error', 'all'],
            'no-restricted-imports': ['error', { patterns: ['./*', '../*', '@mui/*', 'antd', 'styled-components'] }],
            'no-restricted-syntax': ['error', rawHtml, literalText],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['src/app/*/layout.tsx', 'src/app/global-error.tsx'],
        rules: { 'no-restricted-syntax': ['error', literalText] },
    },
    {
        files: ['src/shared/ui/Brand/Brand.tsx'],
        rules: { 'no-restricted-syntax': ['error', rawHtml] },
    },
]);
