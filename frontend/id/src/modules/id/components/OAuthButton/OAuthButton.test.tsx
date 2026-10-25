import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderUi } from '@test/render';
import { OAuthButton } from '@/modules/id/components/OAuthButton/OAuthButton';

afterEach(cleanup);

describe('Yandex sign-in', () => {
    it('starts sign-in through the same-origin backend with the current locale', () => {
        renderUi(<OAuthButton disabled={false} />);

        expect(screen.getByRole('separator')).toHaveTextContent('или');
        expect(screen.getByRole('link', { name: 'Войти с помощью Яндекс ID' })).toHaveAttribute(
            'href',
            '/api/oauth/yandex/start?locale=ru',
        );
    });

    it('disables a second sign-in while another submission is pending', () => {
        renderUi(<OAuthButton disabled />, 'en', 'dark');

        expect(screen.getByRole('separator')).toHaveTextContent('or');
        expect(screen.getByRole('link', { name: 'Sign in with Yandex ID' })).toHaveAttribute('aria-disabled', 'true');
    });
    it('keeps the application destination for OAuth sign-in', () => {
        renderUi(<OAuthButton disabled={false} returnTo="/person/ru" />);

        expect(screen.getByRole('link', { name: 'Войти с помощью Яндекс ID' })).toHaveAttribute(
            'href',
            '/api/oauth/yandex/start?locale=ru&returnTo=%2Fperson%2Fru',
        );
    });
});
