'use client';

import { useTranslate } from '@persons/i18n';
import { BottomMarquee } from '@persons/ui/BottomMarquee';
import { useMarqueePreference } from '@persons/ui/BottomMarquee/useMarqueePreference';
import type { SiteNoticesProps } from '@/shared/ui/SiteNotices/SiteNotices.types';
import { useLocale } from '@persons/i18n';
import { useSiteSettings } from '@persons/person-domain/settings/useSiteSettings';

export function SiteNotices({ enabled = true }: SiteNoticesProps) {
    const t = useTranslate('siteNotices');
    const { hidden } = useMarqueePreference();
    const locale = useLocale();
    const { data } = useSiteSettings();

    if (!(data?.marqueeEnabled ?? enabled) || hidden) {
        return null;
    }

    const items = data?.noticeTexts?.[locale] ?? [t('fictionalCharacters'), t('aiContent')];
    return items.length ? <BottomMarquee label={t('label')} items={items} /> : null;
}
