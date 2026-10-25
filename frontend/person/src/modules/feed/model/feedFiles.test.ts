import { expect, it } from 'vitest';
import { validateFeedFiles, feedFileKind } from '@/modules/feed/model/feedFiles';

it('routes images and videos, rejects unsupported, empty, oversized or excessive files', () => {
    const image = new File(['image'], 'photo.png', { type: 'image/png' });
    const video = new File(['video'], 'moment.mov', { type: '' });
    expect(feedFileKind(image)).toBe('photo');
    expect(feedFileKind(video)).toBe('moment');
    expect(validateFeedFiles([image])).toBeUndefined();
    expect(validateFeedFiles([video])).toBeUndefined();
    expect(validateFeedFiles([image, video])).toBe('fileCount');
    expect(validateFeedFiles([new File(['x'], 'data.svg', { type: 'image/svg+xml' })])).toBe('fileType');
    expect(validateFeedFiles([new File([], 'empty.png', { type: 'image/png' })])).toBe('fileSize');
    Object.defineProperty(image, 'size', { value: 33 * 1024 * 1024 });
    expect(validateFeedFiles([image])).toBe('fileSize');
    expect(validateFeedFiles(Array.from({ length: 11 }, () => video))).toBe('fileCount');
});
