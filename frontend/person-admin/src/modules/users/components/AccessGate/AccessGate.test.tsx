import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AccessGate } from '@/modules/users/components/AccessGate/AccessGate';

vi.mock('@persons/assets/illustrations/access-denied-krel-v1.png', () => ({
    default: { src: '/checkpoint.png', width: 1536, height: 1024 },
}));
afterEach(cleanup);

describe('admin access', () => {
    it('offers an explicit sign-in link for anonymous visitors', () => {
        renderUi(<AccessGate signedIn={false} signInUrl="http://localhost:3000/ru?returnTo=%2Fadmin%2Fru" />);

        expect(screen.getByRole('heading', { name: 'Сначала познакомимся' })).toBeVisible();
        expect(screen.getByRole('link', { name: 'Открыть Персонажи' })).toHaveAttribute(
            'href',
            'http://localhost:3000/ru?returnTo=%2Fadmin%2Fru',
        );
    });

    it('explains restricted access to a signed-in user in English and dark theme', () => {
        renderUi(<AccessGate signedIn signInUrl="http://localhost:3000/en" />, 'en', 'dark');

        expect(screen.getByRole('img', { name: 'Krel at the checkpoint: administrator access only' })).toHaveAttribute(
            'src',
            '/checkpoint.png',
        );
        expect(screen.getByRole('heading', { name: 'Administrator access required' })).toBeVisible();
        expect(screen.getByText('This account does not have access to the CMS.')).toBeVisible();
    });
});
