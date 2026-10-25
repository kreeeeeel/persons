"use client";

import type { SiteSettings } from "@persons/person-client";
import {
    useDynProperty,
    useDynPropertiesStatus,
} from "@persons/dynamic-properties";
import { siteProperties } from "@persons/person-domain/settings/siteProperties";

export function useSiteSettings(initialData?: SiteSettings) {
    const status = useDynPropertiesStatus();
    const marqueeEnabled = useDynProperty(siteProperties.marquee);
    const supportEmail = useDynProperty(siteProperties.email);
    const operatorNames = useDynProperty(siteProperties.operators);
    const catalogPageSize = useDynProperty(siteProperties.pageSize);
    const noticeTexts = useDynProperty(siteProperties.notices);
    const current: SiteSettings = {
        marqueeEnabled,
        supportEmail,
        operatorNames,
        catalogPageSize,
        noticeTexts: Object.fromEntries(
            Object.entries(noticeTexts).map(([locale, values]) => [
                locale,
                [...values],
            ]),
        ),
    };
    const data = status.ready ? current : initialData;
    return {
        data,
        loading: !status.ready && !initialData,
        refreshing: false,
        error: status.error ? "UNAVAILABLE" : undefined,
        refresh: status.refresh,
    };
}
