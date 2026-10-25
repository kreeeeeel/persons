'use client';

import { Configuration, VariablesApi } from '@persons/dynamic-properties';

export const dynamicPropertyClient = new VariablesApi(
    new Configuration({
        basePath: '/api/dynamic-properties',
        credentials: 'same-origin',
    }),
);
