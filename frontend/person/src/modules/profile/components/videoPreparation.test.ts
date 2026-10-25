import { afterEach, expect, it, vi } from 'vitest';
import { prepareVideo } from '@persons/person-domain/media/prepareVideo';
import { isVideoFile } from '@persons/person-domain/media/videoFiles';

afterEach(() => vi.restoreAllMocks());
function preparation(file: File, signal?: AbortSignal) {
    const video = document.createElement('video');
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag, options) =>
        tag === 'video' ? video : create(tag, options),
    );
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:clip'), revokeObjectURL: vi.fn() }));
    vi.spyOn(video, 'load').mockImplementation(() => undefined);
    return { video, result: prepareVideo(file, signal) };
}
it('accepts MOV with QuickTime MIME or an uppercase extension and empty MIME', () => {
    expect(isVideoFile(new File(['video'], 'CLIP.MOV'))).toBe(true);
    expect(isVideoFile(new File(['video'], 'clip', { type: 'video/quicktime' }))).toBe(true);
    expect(isVideoFile(new File(['text'], 'note.txt', { type: 'text/plain' }))).toBe(false);
});
it('allows an unsupported MOV codec to reach server processing and releases its object URL', async () => {
    const { video, result } = preparation(new File(['video'], 'clip.mov', { type: 'video/quicktime' }));
    video.dispatchEvent(new Event('error'));
    expect(await result).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clip');
});
it('still rejects corrupted ordinary videos and never masks cancellation as MOV fallback', async () => {
    const first = preparation(new File(['bad'], 'clip.mp4', { type: 'video/mp4' }));
    first.video.dispatchEvent(new Event('error'));
    await expect(first.result).rejects.toThrow('INVALID_MEDIA');
    vi.restoreAllMocks();
    const controller = new AbortController();
    const second = preparation(new File(['mov'], 'clip.mov'), controller.signal);
    controller.abort();
    await expect(second.result).rejects.toMatchObject({ name: 'AbortError' });
});

it('leaves unreadable MOV metadata to the server but enforces a known duration limit', async () => {
    const first = preparation(new File(['mov'], 'clip.mov'));
    Object.defineProperty(first.video, 'duration', { value: Infinity });
    first.video.dispatchEvent(new Event('loadedmetadata'));
    expect(await first.result).toBeUndefined();
    vi.restoreAllMocks();
    const second = preparation(new File(['mov'], 'clip.mov'));
    Object.defineProperty(second.video, 'duration', { value: 86401 });
    second.video.dispatchEvent(new Event('loadedmetadata'));
    await expect(second.result).rejects.toThrow('INVALID_MEDIA');
});
