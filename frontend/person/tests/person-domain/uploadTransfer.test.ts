import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { uploadTransfer } from '@persons/person-domain/uploads/uploadTransfer';

const errors = vi.hoisted(() => ({ restriction: vi.fn(), code: vi.fn() }));
vi.mock('@persons/person-domain/restrictions/notice', () => ({ notifyRestriction: errors.restriction }));
vi.mock('@persons/person-domain/api/browser', () => ({ personError: errors.code }));

const input = {
    personId: 'person',
    kind: 'PHOTO' as const,
    file: new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
    caption: 'Evening',
    taggedPersonIds: ['friend'],
};
let xhr: XMLHttpRequest;
beforeEach(() => {
    errors.restriction.mockResolvedValue(undefined);
    errors.code.mockResolvedValue('ACTION_RESTRICTED');
    xhr = {
        open: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(() => xhr.onabort?.(new ProgressEvent('abort'))),
        upload: {},
        responseText: '',
        status: 0,
    } as unknown as XMLHttpRequest;
    vi.stubGlobal(
        'XMLHttpRequest',
        vi.fn(function () {
            return xhr;
        }),
    );
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

it('reports actual byte progress, preserves form fields and waits for the server receipt', async () => {
    const update = vi.fn();
    const result = uploadTransfer(input, new AbortController().signal, update);
    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/person/v1/persons/person/media');
    const form = vi.mocked(xhr.send).mock.calls[0][0] as FormData;
    expect(form.get('caption')).toBe('Evening');
    expect(form.getAll('taggedPersonIds')).toEqual(['friend']);
    expect(form.get('file')).toBe(input.file);
    xhr.upload.onprogress?.call(xhr, new ProgressEvent('progress', { lengthComputable: true, loaded: 25, total: 100 }));
    expect(update).toHaveBeenLastCalledWith(25, 'UPLOADING');
    xhr.upload.onload?.call(xhr, new ProgressEvent('load'));
    expect(update).toHaveBeenLastCalledWith(99, 'PROCESSING');
    Object.assign(xhr, { status: 202, responseText: JSON.stringify({ id: 'receipt', status: 'PENDING' }) });
    xhr.onload?.call(xhr, new ProgressEvent('load'));
    expect(await result).toMatchObject({ id: 'receipt', status: 'PENDING' });
});

it('aborts the active network request and rejects cancellation', async () => {
    const controller = new AbortController();
    const result = uploadTransfer(input, controller.signal, vi.fn());
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(xhr.abort).toHaveBeenCalledOnce();
});

it('keeps moderation restrictions visible and returns the translated API error', async () => {
    const result = uploadTransfer(input, new AbortController().signal, vi.fn());
    Object.assign(xhr, { status: 403, responseText: JSON.stringify({ code: 'ACTION_RESTRICTED' }) });
    xhr.onload?.call(xhr, new ProgressEvent('load'));
    await expect(result).rejects.toThrow('ACTION_RESTRICTED');
    expect(errors.restriction).toHaveBeenCalledOnce();
});

it('does not turn an HTML gateway failure into a successful upload', async () => {
    const result = uploadTransfer(input, new AbortController().signal, vi.fn());
    Object.assign(xhr, { status: 502, responseText: '<html>Bad gateway</html>' });
    xhr.onload?.call(xhr, new ProgressEvent('load'));
    await expect(result).rejects.toThrow('UNAVAILABLE');
});
