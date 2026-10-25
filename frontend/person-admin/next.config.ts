import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

const config: NextConfig = {
    agentRules: false,
    output: 'standalone',
    distDir: process.env.PERSONS_NEXT_DIST_DIR ?? '.next',
    outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
    transpilePackages: [
        '@persons/assets',
        '@persons/i18n',
        '@persons/theme',
        '@persons/photo-editor',
        '@persons/ui',
        '@persons/dynamic-properties',
        '@persons/person-domain',
    ],
    experimental: { serverActions: { bodySizeLimit: '1mb' } },
};

export default withNextIntl(config);
