import { defineRouting } from 'next-intl/routing';

const PERSONS_LOCALE = 'PERSONS_LOCALE';

export const routing = defineRouting({
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    localeCookie: { name: PERSONS_LOCALE },
});
