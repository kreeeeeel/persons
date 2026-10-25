import { act, cleanup, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mediaShareLink, readSharedMedia } from '@persons/person-domain/media/shareLink';
import { useMediaLocation } from '@persons/person-domain/hooks/useMediaLocation';
import { MediaShareButton } from '@persons/person-domain/MediaShareButton';
import { renderUi } from '@test/render';

const PHOTO = '06e46ee0-68c1-4b2c-b3fa-d61ff3f6a6fd';
const NEXT = '06e46ee0-68c1-4b2c-b3fa-d61ff3f6a6fe';

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
});

it.each(['PHOTO', 'MOMENT'] as const)('builds a durable public link for %s from CMS', (kind) => {
    const link = mediaShareLink('https://kreeeeeel.ru', 'vadim', kind, PHOTO);
    expect(new URL(link).pathname).toBe('/vadim');
    expect(readSharedMedia(new URL(link).search)).toEqual({ id: PHOTO, kind });
});

it.each(['?photo=bad', `?photo=${PHOTO}&video=${NEXT}`, `?photo=${PHOTO}&photo=${NEXT}`, '?video=', ''])(
    'ignores malformed or ambiguous links: %s',
    (query) => {
        expect(readSharedMedia(query)).toBeUndefined();
    },
);

it('opens a direct video link and closes it without navigating outside the profile', async () => {
    window.history.replaceState(null, '', `/vadim?lang=en&video=${PHOTO}`);
    const back = vi.spyOn(window.history, 'back');
    const { result } = renderHook(() => useMediaLocation('vadim'));
    expect(result.current.media).toEqual({ id: PHOTO, kind: 'MOMENT' });
    act(() => result.current.close());
    await waitFor(() => expect(result.current.media).toBeUndefined());
    expect(window.location.search).toBe('?lang=en');
    expect(back).not.toHaveBeenCalled();
});

it('uses one history entry for a gallery and responds to Back and Forward', () => {
    window.history.replaceState(null, '', '/vadim');
    const push = vi.spyOn(window.history, 'pushState');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
        window.history.replaceState(null, '', '/vadim');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const { result } = renderHook(() => useMediaLocation('vadim'));
    act(() => result.current.open('PHOTO', PHOTO));
    expect(result.current.media?.id).toBe(PHOTO);
    act(() => result.current.open('PHOTO', NEXT));
    expect(push).toHaveBeenCalledOnce();
    expect(result.current.media?.id).toBe(NEXT);
    act(() => result.current.close());
    expect(back).toHaveBeenCalledOnce();
    expect(result.current.media).toBeUndefined();
    act(() => {
        window.history.replaceState(null, '', `/vadim?photo=${NEXT}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.media?.id).toBe(NEXT);
});

it('does not open media from a different profile path', () => {
    window.history.replaceState(null, '', `/krel?photo=${PHOTO}`);
    const { result } = renderHook(() => useMediaLocation('vadim'));
    expect(result.current.media).toBeUndefined();
});

it.each(['PHOTO', 'MOMENT'] as const)(
    'shares %s with an icon-only button and reports clipboard failures',
    async (kind) => {
        const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Denied'));
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        renderUi(<MediaShareButton personTag="vadim" mediaId={PHOTO} kind={kind} publicUrl="https://kreeeeeel.ru" />);
        const button = screen.getByRole('button', { name: 'Поделиться' });
        expect(button).not.toHaveTextContent(/\S/);
        fireEvent.click(button);
        const copiedButton = await screen.findByRole('button', { name: 'Ссылка скопирована' });
        expect(copiedButton).toBeEnabled();
        expect(copiedButton).not.toHaveTextContent(/\S/);
        expect(writeText).toHaveBeenCalledWith(
            `https://kreeeeeel.ru/vadim?${kind === 'PHOTO' ? 'photo' : 'video'}=${PHOTO}`,
        );
        expect(screen.getByRole('link', { name: 'Скачать' })).toHaveAttribute('download', '');
        expect(screen.getByRole('status')).toHaveTextContent('Ссылка скопирована');
        fireEvent.click(copiedButton);
        expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось скопировать ссылку');
    },
);
