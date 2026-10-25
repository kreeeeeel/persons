import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { CookieNotice } from '@/shared/ui/CookieNotice/CookieNotice';
import { openCookiePreferences } from '@/shared/privacy/cookiePreferences';

afterEach(() => {
    cleanup();
    document.cookie = 'PERSONS_OPTIONAL_COOKIES=; Path=/; Max-Age=0';
    vi.unstubAllGlobals();
});

it.each(['accepted', 'rejected'] as const)(
    'persists %s, hides the notice, and allows changing the choice',
    async (choice) => {
        const fetcher = vi.fn(async () => {
            document.cookie = `PERSONS_OPTIONAL_COOKIES=${choice}; Path=/`;
            return new Response('{}');
        });
        vi.stubGlobal('fetch', fetcher);
        renderUi(<CookieNotice />);
        fireEvent.click(screen.getByRole('button', { name: choice === 'accepted' ? 'Согласен' : 'Не согласен' }));
        await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument());
        expect(fetcher).toHaveBeenCalledWith(
            '/api/cookie-preferences',
            expect.objectContaining({ body: JSON.stringify({ choice }) }),
        );
        act(openCookiePreferences);
        expect(screen.getByRole('region')).toBeInTheDocument();
    },
);

it('keeps the choice available after a save error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderUi(<CookieNotice />, 'en', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Disagree' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your choice');
    expect(screen.getByRole('button', { name: 'Agree' })).toBeEnabled();
});

it.each([
    ['ru', 'light', 'Настройки cookie', /Необязательные cookie помогают/],
    ['en', 'dark', 'Cookie preferences', /Optional cookies/],
] as const)(
    'shows only the description and choices without a heading in %s/%s',
    (locale, theme, label, description) => {
        renderUi(<CookieNotice />, locale, theme);
        expect(screen.getByRole('region', { name: label })).toHaveTextContent(description);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(2);
    },
);
