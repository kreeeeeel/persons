import type { PropsWithChildren, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@gravity-ui/uikit';
import { I18nProvider } from '@persons/i18n';
import { UploadQueueProvider } from '@persons/person-domain/UploadQueueProvider';
import { UploadQueue } from '@persons/person-domain/uploads/UploadQueue';
import { uploadTransfer } from '@persons/person-domain/uploads/uploadTransfer';
import { defaultMessages } from '@/shared/i18n/messages';
const { ru, en } = defaultMessages;

export function renderUi(children: ReactNode, locale: 'ru' | 'en' = 'ru', theme: 'light' | 'dark' = 'light') {
    const queue = new UploadQueue(uploadTransfer);
    return render(children, {
        wrapper: ({ children }: PropsWithChildren) => (
            <I18nProvider locale={locale} messages={locale === 'ru' ? ru : en}>
                <ThemeProvider theme={theme} lang={locale}>
                    <UploadQueueProvider queue={queue}>{children}</UploadQueueProvider>
                </ThemeProvider>
            </I18nProvider>
        ),
    });
}
