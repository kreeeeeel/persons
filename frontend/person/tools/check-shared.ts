import path from 'node:path';
import { ESLint } from 'eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslint = new ESLint({
    cwd: path.resolve(import.meta.dirname, '../..'),
    overrideConfigFile: true,
    overrideConfig: [
        ...nextVitals,
        ...nextTypescript,
        { ignores: ['**/node_modules/**', '**/.build/**'] },
        {
            files: ['libs/**/*.{ts,tsx}'],
            settings: { next: { rootDir: path.resolve(import.meta.dirname, '..') } },
            rules: {
                curly: ['error', 'all'],
                'no-restricted-imports': ['error', { patterns: ['./*', '../*'] }],
                'no-restricted-syntax': [
                    'error',
                    {
                        selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/]",
                        message: 'Use Gravity UI.',
                    },
                    { selector: 'JSXText[value=/[a-zA-ZА-Яа-я]/]', message: 'Use translations.' },
                ],
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            },
        },
    ],
});
const results = await eslint.lintFiles(['libs/person-domain/src', 'libs/ui/src', 'libs/dynamic-properties/src']);
process.stdout.write(await (await eslint.loadFormatter('stylish')).format(results));
if (results.some((result) => result.errorCount > 0)) {
    process.exitCode = 1;
}
