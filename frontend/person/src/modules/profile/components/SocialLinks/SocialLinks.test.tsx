import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { SocialLinks } from '@/modules/profile/components/SocialLinks/SocialLinks';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('renders social networks as accessible linked buttons with their own icons', () => {
    renderUi(<SocialLinks links={[{ network: 'TELEGRAM', url: 'https://t.me/telegram' }]} />);
    const link = screen.getByRole('link', { name: 'Telegram' });
    expect(link).toHaveAttribute('href', 'https://t.me/telegram');
    expect(link.querySelector('img')).toHaveAttribute('src', '/media/social-telegram.svg');
    expect(within(link).getByText('Telegram')).toBeInTheDocument();
});

it('shows and copies a Discord tag without navigating to a URL', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    renderUi(<SocialLinks links={[{ network: 'DISCORD', tag: 'some.user_42' }]} />);
    const contact = screen.getByRole('button', { name: 'Discord · some.user_42' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(contact.querySelector('img')).toHaveAttribute('src', '/media/social-discord.svg');
    fireEvent.click(contact);
    await waitFor(() => expect(copy).toHaveBeenCalledWith('some.user_42'));
});

it('shows a useful error when copying a Discord tag fails', async () => {
    const copy = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    renderUi(<SocialLinks links={[{ network: 'DISCORD', tag: 'СтарыйНик#1234' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discord · СтарыйНик#1234' }));
    expect(await screen.findByText('Не удалось скопировать тег. Скопируйте его вручную.')).toBeVisible();
});
