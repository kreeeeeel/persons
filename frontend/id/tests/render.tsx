import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@gravity-ui/uikit';
import { I18nProvider } from '@persons/i18n';
import { defaultMessages } from '@/shared/i18n/messages';
const { ru, en } = defaultMessages;

export function renderUi(children: ReactNode, locale: 'ru' | 'en' = 'ru', theme: 'light' | 'dark' = 'light') {
    return render(
        <I18nProvider locale={locale} messages={locale === 'ru' ? ru : en}>
            <ThemeProvider theme={theme} lang={locale}>
                {children}
            </ThemeProvider>
        </I18nProvider>,
    );
}
