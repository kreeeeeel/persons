import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { SiteSettingsScreen } from '@/modules/settings/screens/SiteSettingsScreen/SiteSettingsScreen';

const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { siteSettings: { getAdminSiteSettings: api.load, updateSiteSettings: api.save } },
    personError: async () => 'UNAVAILABLE',
}));

beforeEach(() => {
    vi.clearAllMocks();
    api.load.mockResolvedValue({ marqueeEnabled: true });
    api.save.mockImplementation(async ({ siteSettings }) => {
        api.load.mockResolvedValue(siteSettings);
        return siteSettings;
    });
});

afterEach(cleanup);

it('loads and saves the global ticker preference and restores it when reopened', async () => {
    const view = renderUi(<SiteSettingsScreen />);
    const toggle = await screen.findByRole('switch', { name: 'Показывать бегущую строку' });
    const save = screen.getByRole('button', { name: 'Сохранить' });
    expect(toggle).toBeChecked();
    expect(save).toBeDisabled();
    fireEvent.click(toggle);
    fireEvent.click(save);

    await waitFor(() => expect(api.save).toHaveBeenCalledWith({ siteSettings: { marqueeEnabled: false } }));
    expect(await screen.findByText('Настройки сохранены.')).toBeVisible();
    await waitFor(() => expect(save).toBeDisabled());
    view.unmount();

    renderUi(<SiteSettingsScreen />, 'en');
    expect(await screen.findByRole('switch', { name: 'Show the scrolling ticker' })).not.toBeChecked();
});

it('keeps the edited preference after a failed save', async () => {
    api.save.mockRejectedValue(new Error('offline'));
    renderUi(<SiteSettingsScreen />);
    const toggle = await screen.findByRole('switch');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Не удалось связаться с сервисом. Попробуйте ещё раз.');
    expect(toggle).not.toBeChecked();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled());
});

it('offers retry after a failed load without offering an unknown setting', async () => {
    api.load.mockRejectedValueOnce(new Error('offline'));
    renderUi(<SiteSettingsScreen />);

    const retry = await screen.findByRole('button', { name: 'Попробовать ещё раз' });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByRole('switch')).toBeChecked();
});
