import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { LegalScreen } from '@/modules/legal/screens/LegalScreen/LegalScreen';

const state = vi.hoisted(() => ({
    data: {
        marqueeEnabled: true,
        supportEmail: 'privacy@example.test',
        operatorNames: { ru: 'Оператор для проверки', en: 'Preview operator' },
    },
}));
vi.mock('next/navigation', () => ({
    usePathname: () => null,
    useSearchParams: () => null,
    useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@persons/person-domain/settings/useSiteSettings', () => ({ useSiteSettings: () => state }));

beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            observe = vi.fn();
            disconnect = vi.fn();
        },
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('provides section anchors and updates contact information in the open policy', () => {
    const view = renderUi(<LegalScreen kind="privacy" />);
    expect(screen.getByRole('heading', { name: 'Политика конфиденциальности' })).toBeInTheDocument();
    expect(screen.queryByText('Проект для согласования')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Язык' })).toBeInTheDocument();
    expect(screen.getByText(/Базы данных и хранилище медиа размещаются в России/)).toBeInTheDocument();
    expect(screen.getByText(/пять лет с даты удаления/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Какие данные обрабатываются/ })).toHaveAttribute('href', '#data');
    expect(screen.getByRole('link', { name: 'privacy@example.test' })).toHaveAttribute(
        'href',
        'mailto:privacy@example.test',
    );
    state.data.supportEmail = 'changed@example.test';
    view.rerender(<LegalScreen kind="privacy" />);
    expect(screen.getByRole('link', { name: 'changed@example.test' })).toHaveAttribute(
        'href',
        'mailto:changed@example.test',
    );
    state.data.supportEmail = 'privacy@example.test';
});

it('renders English terms and localized navigation', () => {
    renderUi(<LegalScreen kind="terms" />, 'en', 'dark');
    expect(screen.getByRole('heading', { name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/en/privacy');
    expect(screen.getByText('Preview operator')).toBeInTheDocument();
});
