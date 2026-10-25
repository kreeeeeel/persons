import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { PublicationSettingsScreen } from '@/modules/settings/screens/PublicationSettingsScreen/PublicationSettingsScreen';
import { UserModerationDialog } from '@/modules/users/components/UserModerationDialog/UserModerationDialog';

const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), user: vi.fn(), saveUser: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: {
        publication: {
            getPublicationSettings: api.load,
            updatePublicationSettings: api.save,
            getUserModerationSettings: api.user,
            updateUserModerationSettings: api.saveUser,
        },
    },
    personError: async () => 'UNAVAILABLE',
}));
beforeEach(() => {
    vi.clearAllMocks();
    api.load.mockResolvedValue({
        commentsRequireModeration: true,
        photosRequireModeration: true,
        momentsRequireModeration: true,
        reviewsRequireModeration: true,
        loansRequireModeration: true,
        pagesRequireModeration: true,
        profileChangesRequireModeration: true,
        avatarsRequireModeration: true,
    });
    api.save.mockImplementation(async ({ publicationSettings }) => publicationSettings);
    api.user.mockResolvedValue({ forceModeration: false });
    api.saveUser.mockResolvedValue({ forceModeration: true });
});
afterEach(cleanup);

it('loads the current policy and saves independent content switches', async () => {
    renderUi(<PublicationSettingsScreen />);
    const switches = await screen.findAllByRole('switch');
    expect(switches).toHaveLength(8);
    expect(switches[0]).toBeChecked();
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.save).toHaveBeenCalledWith({
            publicationSettings: {
                commentsRequireModeration: false,
                photosRequireModeration: true,
                momentsRequireModeration: true,
                reviewsRequireModeration: true,
                loansRequireModeration: true,
                pagesRequireModeration: true,
                profileChangesRequireModeration: true,
                avatarsRequireModeration: true,
            },
        }),
    );
    expect(await screen.findByText('Настройки сохранены.')).toBeInTheDocument();
});

it('saves a per-user override without changing the global policy', async () => {
    const close = vi.fn();
    renderUi(<UserModerationDialog userId="user-id" name="Друг" onClose={close} />);
    const toggle = await screen.findByRole('switch');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(api.saveUser).toHaveBeenCalledWith({ id: 'user-id', userModerationSettings: { forceModeration: true } });
    expect(api.save).not.toHaveBeenCalled();
});

it('shows a failed load with retry and prevents saving unknown user settings', async () => {
    api.user.mockRejectedValueOnce(new Error('offline'));
    renderUi(<UserModerationDialog userId="user-id" name="Друг" onClose={vi.fn()} />);
    await screen.findByRole('button', { name: 'Попробовать ещё раз' });
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByRole('switch')).not.toBeChecked();
});

it('keeps comments reviews and loans independent when saving policy', async () => {
    renderUi(<PublicationSettingsScreen />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Отзывы к оценкам' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Изменение своей страницы' }));
    expect(screen.getByRole('switch', { name: 'Комментарии' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Займы' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.save).toHaveBeenCalledWith({
            publicationSettings: expect.objectContaining({
                commentsRequireModeration: true,
                reviewsRequireModeration: false,
                loansRequireModeration: true,
                profileChangesRequireModeration: false,
            }),
        }),
    );
});
