import { getRequestConfig } from 'next-intl/server';
import { resolveLocale } from '@persons/i18n/locale';
import { loadMessages } from '@persons/i18n/server';
import { defaultMessages } from '@/shared/i18n/messages';
import { getServerConfig } from '@/shared/config/server';

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = resolveLocale(await requestLocale);

    return {
        locale,
        messages: await loadMessages(locale, getServerConfig().i18nUrl, defaultMessages[locale]),
        timeZone: 'Europe/Moscow',
    };
});
