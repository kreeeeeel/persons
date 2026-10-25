import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PLAYBACK_STORAGE_KEY } from '@persons/ui/VideoPlayer/playbackPreferences';
import { VideoPlayer } from '@persons/ui/VideoPlayer';
import { renderUi } from '@test/render';

const labels = {
    play: 'Смотреть',
    pause: 'Пауза',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    seek: 'Позиция',
    volume: 'Громкость',
    fullscreen: 'На весь экран',
    fullscreenError: 'Полный экран недоступен',
    exitFullscreen: 'Выйти',
    error: 'Ошибка видео',
    retry: 'Повторить',
    loading: 'Загрузка',
    settings: 'Настройки плеера',
    speed: 'Скорость',
    quality: 'Качество',
    original: 'Оригинал',
};

beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
        fireEvent.play(this);
        return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
        fireEvent.pause(this);
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

it('changes speed and real quality while retaining playback position and play state', async () => {
    const view = renderUi(
        <VideoPlayer
            src="/original.mp4"
            sources={[{ src: '/360.mp4', label: '360p' }]}
            title="Момент"
            labels={labels}
        />,
    );
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 80 });
    fireEvent.loadedMetadata(video);
    video.currentTime = 23;
    fireEvent.timeUpdate(video);
    fireEvent.play(video);
    fireEvent.click(screen.getByRole('button', { name: 'Настройки плеера' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Скорость/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '1.5×' }));
    expect(video.playbackRate).toBe(1.5);
    fireEvent.click(screen.getByRole('button', { name: 'Настройки плеера' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Качество/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '360p' }));
    expect(video).toHaveAttribute('src', '/360.mp4');
    fireEvent.loadStart(video);
    video.currentTime = 0;
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(23);
    expect(video.playbackRate).toBe(1.5);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
    expect(view.container.querySelector('video')).toBe(video);
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it('returns from either settings list without applying an option or closing the menu', async () => {
    renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'Настройки плеера' }));
    for (const name of ['Скорость', 'Качество']) {
        fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(name) }));
        expect(screen.getAllByRole('menuitemradio').length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('button', { name }));
        expect(screen.getByRole('menuitem', { name: /Скорость/ })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: /Качество/ })).toBeVisible();
    }
});

it('exposes custom controls after metadata, updates playback and toggles audio', async () => {
    const view = renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    const video = view.container.querySelector('video')!;
    expect(video.controls).toBe(false);
    Object.defineProperty(video, 'duration', { value: 80 });
    fireEvent.loadedMetadata(video);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('1×')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Смотреть' }).at(-1)!);
    expect(await screen.findByRole('button', { name: 'Пауза' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Выключить звук' }));
    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Включить звук' }));
    expect(video.muted).toBe(false);
    fireEvent.ended(video);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Смотреть' }).length).toBe(2));
});

it('offers a retry after a media loading error', () => {
    const view = renderUi(<VideoPlayer src="/missing.webm" title="Момент" labels={labels} />);
    fireEvent.error(view.container.querySelector('video')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка видео');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps the timer width stable across digit changes and follows native audio changes', () => {
    const view = renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 800 });
    fireEvent.loadedMetadata(video);
    video.currentTime = 9;
    fireEvent.timeUpdate(video);
    const width = screen.getByText('0:09 / 13:20').style.width;
    video.currentTime = 600;
    fireEvent.timeUpdate(video);
    expect(screen.getByText('10:00 / 13:20').style.width).toBe(width);
    video.volume = 0.25;
    fireEvent.volumeChange(video);
    expect(screen.getByRole('slider', { name: 'Громкость' })).toHaveAttribute('aria-valuenow', '25');
    video.volume = 0;
    fireEvent.volumeChange(video);
    const unmute = screen.getByRole('button', { name: 'Включить звук' });
    fireEvent.click(unmute);
    expect(video.volume).toBe(0.25);
    expect(video.muted).toBe(false);
    expect(screen.getByRole('button', { name: 'Выключить звук' })).toBeVisible();
});

it('shows the rotating brand logo during initial loading and playback buffering', () => {
    const view = renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    const video = view.container.querySelector('video')!;
    expect(screen.getByRole('status', { name: 'Загрузка' }).querySelector('img')).toHaveAttribute(
        'src',
        '/media/logo.svg?v=vadim-v1',
    );
    fireEvent.loadedMetadata(video);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.waiting(video);
    expect(screen.getByRole('status', { name: 'Загрузка' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Смотреть' })).toHaveLength(1);
    fireEvent.playing(video);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('keeps the player usable when fullscreen permission is denied', async () => {
    renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    Object.defineProperty(screen.getByRole('group', { name: 'Момент' }), 'requestFullscreen', {
        value: vi.fn().mockRejectedValue(new Error('denied')),
    });
    fireEvent.click(screen.getByRole('button', { name: 'На весь экран' }));
    expect(await screen.findByText('Полный экран недоступен')).toBeInTheDocument();
});

it('seeks with the keyboard and toggles between entering and exiting fullscreen', async () => {
    const view = renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 80 });
    fireEvent.loadedMetadata(video);
    fireEvent.keyDown(video, { key: 'ArrowRight' });
    expect(video.currentTime).toBe(5);
    const player = screen.getByRole('group', { name: 'Момент' });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => player });
    const exit = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
    fireEvent(document, new Event('fullscreenchange'));
    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }));
    await waitFor(() => expect(exit).toHaveBeenCalledOnce());
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
});

it('applies saved autoplay, muted playback, speed and preferred available quality', () => {
    localStorage.setItem(
        PLAYBACK_STORAGE_KEY,
        JSON.stringify({ autoplay: true, muted: true, speed: 1.5, quality: '720', volume: 30 }),
    );
    const view = renderUi(
        <VideoPlayer
            src="/original.mp4"
            sources={[{ src: '/480.mp4', label: '480p' }]}
            title="Момент"
            labels={labels}
        />,
    );
    const video = view.container.querySelector('video')!;
    expect(video.volume).toBe(0.3);
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('src', '/480.mp4');
    fireEvent.loadedMetadata(video);
    expect(video.playbackRate).toBe(1.5);
});

it('starts at half volume when no preference is saved', () => {
    const view = renderUi(<VideoPlayer src="/test.webm" title="Момент" labels={labels} />);
    expect(view.container.querySelector('video')?.volume).toBe(0.5);
    expect(screen.getByRole('slider', { name: 'Громкость' })).toHaveAttribute('aria-valuenow', '50');
});

it('falls back from an unsupported MOV to a compatible rendition, including one that arrives later', () => {
    const view = renderUi(<VideoPlayer src="/original.mov" title="Момент" labels={labels} />);
    const video = view.container.querySelector('video')!;
    fireEvent.error(video);
    expect(screen.getByRole('alert')).toBeVisible();
    view.rerender(
        <VideoPlayer
            src="/original.mov"
            sources={[{ src: '/compatible.mp4', label: '240p' }]}
            title="Момент"
            labels={labels}
        />,
    );
    expect(video).toHaveAttribute('src', '/compatible.mp4');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.loadStart(video);
    Object.defineProperty(video, 'duration', { value: 4 });
    fireEvent.loadedMetadata(video);
    expect(screen.getAllByRole('button', { name: 'Смотреть' })[0]).toBeEnabled();
});

it('stops after all renditions fail and allows an explicit retry', () => {
    const view = renderUi(
        <VideoPlayer
            src="/original.mov"
            sources={[{ src: '/compatible.mp4', label: '360p' }]}
            title="Момент"
            labels={labels}
        />,
    );
    const video = view.container.querySelector('video')!;
    fireEvent.error(video);
    expect(video).toHaveAttribute('src', '/compatible.mp4');
    fireEvent.error(video);
    expect(screen.getByRole('alert')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(video).toHaveAttribute('src', '/original.mov');
});
