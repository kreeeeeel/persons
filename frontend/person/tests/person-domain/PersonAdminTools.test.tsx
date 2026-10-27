import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { PersonProfile } from '@persons/person-client';
import { PersonAdminTools } from '@persons/person-domain/PersonAdminTools';
import { renderUi } from '@test/render';

afterEach(cleanup);

const profile: PersonProfile = {
    id: 'person',
    tag: 'friend',
    fullName: 'Друг',
    firstName: 'Друг',
    lastName: '',
    description: '',
    tags: [],
    socialLinks: [],
    ratingOptions: [{ id: 'rating', emoji: '💜', label: 'Свой', count: 0, selected: false }],
    canEdit: true,
    version: 0,
    stats: {
        comments: 0,
        ratings: 0,
        views: 0,
        moments: 0,
        photos: 0,
        creditEntries: 0,
        creditScore: 0,
        reputation: 'UNKNOWN',
    },
};

it('opens all page tools in a dropdown and keeps emoji configuration out of the editor', async () => {
    renderUi(<PersonAdminTools profile={profile} onSaved={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Управление страницей' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Редактирование страницы' })).toBeVisible();
    ['Изменить аватар', 'Привязка аккаунта', 'Репутация', 'Выдать достижение', 'Блокировки'].forEach((name) => {
        expect(screen.getByRole('menuitem', { name })).toBeVisible();
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Редактирование страницы' }));
    expect(screen.getByRole('textbox', { name: 'Тег страницы' })).toHaveValue('friend');
    await waitFor(() =>
        expect(screen.queryByRole('menuitem', { name: 'Редактирование страницы' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('Оценки')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Эмодзи' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Значение' })).not.toBeInTheDocument();
});
