import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfileEditor } from '@persons/person-domain/ProfileEditor';
import { renderUi } from '@test/render';
import type { PersonProfile } from '@persons/person-client';
import { Flex } from '@gravity-ui/uikit';

const api = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), get: vi.fn() }));
vi.mock('@persons/person-domain/api/browser', () => ({
    personClient: { persons: { updatePerson: api.update, createPerson: api.create, getPerson: api.get } },
    personError: vi.fn(),
}));
vi.mock('@persons/person-domain/MediaUploader', () => ({
    MediaUploader: ({ personId, kind }: { personId: string; kind: string }) => (
        <Flex role="dialog" aria-label="Avatar picker">{`${personId}:${kind}`}</Flex>
    ),
}));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
const profile: PersonProfile = {
    id: 'person',
    tag: 'person',
    fullName: 'Персона',
    firstName: 'Персона',
    lastName: '',
    description: '',
    tags: [],
    socialLinks: [{ network: 'DISCORD', url: 'https://discord.com/users/123' }],
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

it('shows page identity and grouped navigation with a persistent selected section', () => {
    renderUi(<ProfileEditor administrator profile={profile} onClose={vi.fn()} onSaved={vi.fn()} />);
    const identity = screen.getByRole('group', { name: 'Информация о странице' });
    expect(within(identity).getByText('Персона')).toBeVisible();
    expect(within(identity).getByText('@person')).toBeVisible();
    const navigation = screen.getByRole('menu', { name: 'Разделы' });
    ['Страница', 'Статусы', 'Видимость и контакты'].forEach((label) => {
        expect(within(navigation).getByText(label)).toBeVisible();
    });
    const main = within(navigation).getByRole('menuitem', { name: 'Основное' });
    expect(main).toHaveAttribute('aria-current', 'page');
    const army = within(navigation).getByRole('menuitem', { name: 'Армия' });
    fireEvent.click(army);
    expect(army).toHaveAttribute('aria-current', 'page');
    expect(main).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('region', { name: 'Армия' })).toBeVisible();
});

it('edits and clears calendar dates through the generated profile input', async () => {
    api.update.mockResolvedValue({ id: 'receipt', status: 'APPROVED' });
    renderUi(
        <ProfileEditor
            administrator
            profile={{ ...profile, dates: { birthDate: new Date('2001-05-14') } }}
            onClose={vi.fn()}
            onSaved={vi.fn()}
        />,
    );
    expect(screen.getByLabelText('Дата рождения')).toHaveValue('2001-05-14');
    fireEvent.change(screen.getByLabelText('Дата рождения'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Армия' }));
    fireEvent.change(screen.getByLabelText('Дата ухода в армию'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Дата возвращения из армии'), { target: { value: '2027-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith(
            expect.objectContaining({
                profileInput: expect.objectContaining({
                    dates: {
                        birthDate: undefined,
                        militaryDepartureDate: new Date('2026-06-01'),
                        militaryReturnDate: new Date('2027-06-01'),
                    },
                }),
            }),
        ),
    );
});

it.each(['Имя', 'Фамилия', 'Отчество'])('limits %s on page forms and rejects overlong legacy values', async (label) => {
    renderUi(<ProfileEditor administrator profile={profile} onClose={vi.fn()} onSaved={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: label });
    expect(input).toHaveAttribute('maxlength', '10');
    fireEvent.change(input, { target: { value: 'я'.repeat(11) } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Проверьте введённые данные.')).toBeVisible();
    expect(api.update).not.toHaveBeenCalled();
});

it('keeps rating configuration out of administrator creation without a moderation warning', () => {
    renderUi(<ProfileEditor administrator onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Тег страницы')).toBeVisible();
    expect(screen.queryByText('Оценки')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Эмодзи' })).not.toBeInTheDocument();
    expect(screen.queryByText(/после модерации/i)).not.toBeInTheDocument();
});

it('removes rating configuration from a personal page request', () => {
    renderUi(<ProfileEditor ownRequest onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Тег страницы')).toBeVisible();
    expect(screen.queryByText('Оценки')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('💜')).not.toBeInTheDocument();
});

it('keeps a legacy Discord contact visible and lets the user replace or clear it', () => {
    renderUi(<ProfileEditor profile={profile} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Социальные сети' }));
    const discord = screen.getByRole('textbox', { name: 'Discord · тег' });
    expect(discord).toHaveValue('https://discord.com/users/123');
    fireEvent.change(discord, { target: { value: 'my_username' } });
    expect(discord).toHaveValue('my_username');
    fireEvent.change(discord, { target: { value: '' } });
    expect(discord).toHaveValue('');
});

it('reports the approved new tag so the page can replace its URL without reloading the old one', async () => {
    const saved = vi.fn();
    const receipt = { id: 'receipt', status: 'APPROVED' };
    api.update.mockResolvedValueOnce(receipt);
    renderUi(<ProfileEditor administrator profile={profile} onClose={vi.fn()} onSaved={saved} />);
    expect(screen.queryByText('Оценки')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Значение' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Тег страницы' }), { target: { value: 'new-person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith(receipt, 'new-person'));
    expect(api.update).toHaveBeenCalledWith(
        expect.objectContaining({
            id: profile.id,
            profileInput: expect.objectContaining({
                tag: 'new-person',
                ratingOptions: [{ emoji: '💜', label: 'Свой' }],
            }),
        }),
    );
});

it.each([true, false])(
    'edits and clears search keywords separately from visible tags, administrator=%s',
    async (administrator) => {
        const saved = vi.fn();
        api.update.mockResolvedValue({ id: 'receipt', status: administrator ? 'APPROVED' : 'PENDING' });
        const view = renderUi(
            <ProfileEditor
                administrator={administrator}
                profile={{ ...profile, tags: ['Свой'], searchKeywords: ['старое имя'] }}
                onClose={vi.fn()}
                onSaved={saved}
            />,
        );
        fireEvent.click(screen.getByRole('menuitem', { name: 'Поиск' }));
        const input = screen.getByRole('textbox', { name: 'Ключевые слова для поиска' });
        expect(input).toHaveValue('старое имя');
        fireEvent.change(input, { target: { value: ' кирилл, немтырев, ' } });
        fireEvent.click(screen.getByRole('button', { name: administrator ? 'Сохранить' : 'Отправить на модерацию' }));
        await waitFor(() =>
            expect(api.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    profileInput: expect.objectContaining({ searchKeywords: ['кирилл', 'немтырев'], tags: ['Свой'] }),
                }),
            ),
        );
        view.unmount();
        api.update.mockClear();
        renderUi(
            <ProfileEditor
                administrator
                profile={{ ...profile, searchKeywords: ['кирилл'] }}
                onClose={vi.fn()}
                onSaved={saved}
            />,
        );
        fireEvent.click(screen.getByRole('menuitem', { name: 'Поиск' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Ключевые слова для поиска' }), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
        await waitFor(() =>
            expect(api.update).toHaveBeenCalledWith(
                expect.objectContaining({ profileInput: expect.objectContaining({ searchKeywords: [] }) }),
            ),
        );
    },
);

it('explains excessive search keywords before submitting', async () => {
    renderUi(<ProfileEditor administrator profile={profile} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Поиск' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Ключевые слова для поиска' }), {
        target: { value: Array.from({ length: 21 }, (_, index) => `слово${index}`).join(', ') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(
        await screen.findByText('Укажите не больше 20 ключевых слов или фраз, до 80 символов каждое.'),
    ).toBeVisible();
    expect(api.update).not.toHaveBeenCalled();
});

it('keeps description drafts when saving a dated presence status, and explicitly clears it', async () => {
    api.update.mockResolvedValue({ id: 'receipt', status: 'APPROVED' });
    renderUi(
        <ProfileEditor
            administrator
            profile={{ ...profile, presence: { status: 'MISSING', since: new Date('2026-01-02') } }}
            onClose={vi.fn()}
            onSaved={vi.fn()}
        />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Описание и теги' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Описание' }), { target: { value: 'Сохранённое описание' } });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Пропал без вести' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith(
            expect.objectContaining({
                profileInput: expect.objectContaining({
                    description: 'Сохранённое описание',
                    presence: { status: 'MISSING', since: new Date('2026-01-02') },
                }),
            }),
        ),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox', { name: 'Статус связи' }));
    fireEvent.click(screen.getByRole('option', { name: 'На связи' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
        expect(api.update).toHaveBeenLastCalledWith(
            expect.objectContaining({
                profileInput: expect.objectContaining({ presence: {} }),
            }),
        ),
    );
});

it('creates a profile before opening the existing avatar uploader with its real person id', async () => {
    api.create.mockResolvedValueOnce({ id: 'receipt', status: 'APPROVED', personId: profile.id });
    api.get.mockResolvedValueOnce(profile);
    const saved = vi.fn();
    renderUi(<ProfileEditor administrator onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Имя' }), { target: { value: 'Персона' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Тег страницы' }), { target: { value: 'person' } });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Аватар' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить и выбрать аватар' }));
    expect(await screen.findByRole('dialog', { name: 'Avatar picker' })).toHaveTextContent('person:AVATAR');
    expect(api.create).toHaveBeenCalledOnce();
    expect(saved).not.toHaveBeenCalled();
});
