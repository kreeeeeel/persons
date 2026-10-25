import 'server-only';

import { personApi } from '@/shared/api/person';
import type { SiteSettings } from '@persons/person-client';

export async function getMarqueeEnabled(): Promise<boolean> {
    return (await getSiteSettings())?.marqueeEnabled ?? false;
}

export async function getSiteSettings(): Promise<SiteSettings | undefined> {
    try {
        const settings = await (await personApi()).siteSettings.getSiteSettings();
        return settings;
    } catch (error) {
        console.error('Unable to load site interface settings', {
            cause: error instanceof Error ? error.name : 'Unknown',
        });
        return undefined;
    }
}
