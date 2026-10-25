const LANGUAGE_0 = 0;
export const locales = ['ru', 'en'] as const;

export type Locale = (typeof locales)[number];

export function resolveLocale(value: string | undefined): Locale {
    const language = value?.toLowerCase().split(/[-_,;]/)[LANGUAGE_0];

    return language === 'en' ? 'en' : 'ru';
}
