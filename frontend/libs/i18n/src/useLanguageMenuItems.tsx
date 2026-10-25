'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Flag } from '@persons/i18n/Flag/Flag';
import { useLocale, useLocaleCatalogs } from '@persons/i18n/provider';
import type { Locale } from '@persons/i18n/locale';
import styles from '@persons/i18n/useLanguageMenuItems.module.css';

const SEGMENTS_1_1 = 1;

export function useLanguageMenuItems() {
    const locale = useLocale();
    const catalogs = useLocaleCatalogs();
    const pathname = usePathname() ?? '/';
    const search = useSearchParams();
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const choices = [
        { locale: 'ru' as const, label: 'Русский', country: 'ru' },
        { locale: 'en' as const, label: 'English', country: 'gb' },
    ];

    function choose(next: Locale) {
        if (next === locale) {
            return;
        }

        document.cookie = `PERSONS_LOCALE=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;

        if (catalogs?.[next]) {
            const url = new URL(window.location.href);

            url.pathname = url.pathname.replace(`/${locale}`, `/${next}`);
            window.history.replaceState(null, '', url);

            return;
        }

        const segments = pathname.split('/');

        segments[SEGMENTS_1_1] = next;

        const query = search?.toString() ?? '';

        startTransition(() =>
            router.push(`${segments.join('/')}${query ? `?${query}` : ''}${window.location.hash}`, {
                scroll: false,
            }),
        );
    }

    return {
        locale,
        pending,
        choices,
        choose,
        items: choices.map((choice) => ({
            text: choice.label,
            className: styles.item,
            iconStart: <Flag country={choice.country} />,
            selected: choice.locale === locale,
            action: () => choose(choice.locale),
        })),
    };
}
