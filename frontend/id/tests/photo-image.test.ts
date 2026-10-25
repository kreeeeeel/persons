import { describe, expect, it } from 'vitest';
import { inspectPhoto, isPhotoSizeAllowed } from '@persons/photo-editor/image';

const BYTES_33 = 33;
const SET_137 = 137;
const SET_80 = 80;
const SET_78 = 78;
const SET_71 = 71;
const SET_13 = 13;
const SET_10 = 10;
const SET_26 = 26;
const SET_UINT32_8 = 8;
const SET_UINT32_13 = 13;
const SET_UINT32_12 = 12;
const SET_UINT32_1229472850 = 0x49484452;
const SET_UINT32_16 = 16;
const SET_UINT32_20 = 20;
const BYTES_20 = 20;
const BYTES_2 = 2;
const RIFF = 'RIFF';
const WEBP = 'WEBP';
const SET_8 = 8;
const SET_12 = 12;
const SET_UINT32_4 = 4;
const BYTES_LENGTH_8 = 8;
const SET_20 = 20;
const EACH_256 = 256;
const EACH_1920 = 1920;
const EACH_1080 = 1080;
const EACH_4000 = 4000;
const EACH_3000 = 3000;
const EACH_8192 = 8192;
const EACH_4096 = 4096;
const EACH_255 = 255;
const EACH_9000 = 9000;
const EACH_1000 = 1000;
const EACH_1600 = 1600;
const EACH_0 = 0;
const EACH_800 = 800;
const JPEG_255 = 255;
const JPEG_216 = 216;
const JPEG_225 = 225;
const JPEG_0 = 0;
const JPEG_4 = 4;
const JPEG_194 = 194;
const JPEG_8 = 8;
const JPEG_56 = 56;
const JPEG_7 = 7;
const JPEG_128 = 128;
const JPEG_3 = 3;
const LOSSY_0 = 0;
const LOSSY_157 = 157;
const LOSSY_1 = 1;
const LOSSY_42 = 42;
const LOSSY_4 = 4;
const LOSSY_3 = 3;
const LOSSLESS_5 = 5;
const LOSSLESS_0_0 = 0;
const LOSSLESS_0_47 = 47;
const SET_UINT32_1 = 1;
const VALUE_1023 = 1023;
const VALUE_767 = 767;
const VALUE_14 = 14;
const VP8L = 'VP8L';
const EXTENDED_0 = 0;
const EXTENDED_255 = 255;
const EXTENDED_3 = 3;
const EXTENDED_2 = 2;
const VP8X = 'VP8X';
const EXTENDED_0_0 = 0;
const EXTENDED_0_2 = 2;
const PNG_512 = 512;
const FILE_255 = 255;
const FILE_216 = 216;
const OVERSIZED_512 = 512;
const VALUE_10 = 10;
const VALUE_1024 = 1024;
const MIN_VALUE_LENGTH = 1;
const IS_PHOTO_SIZE_ALLOWED_512 = 512;

function file(bytes: Uint8Array, type: string, name: string): File {
    const buffer = Uint8Array.from(bytes).buffer;
    const value = new File([buffer], name, { type });

    Object.defineProperty(value, 'arrayBuffer', { value: async () => buffer });

    return value;
}

function png(width: number, height: number): Uint8Array {
    const bytes = new Uint8Array(BYTES_33);

    bytes.set([SET_137, SET_80, SET_78, SET_71, SET_13, SET_10, SET_26, SET_10]);

    const view = new DataView(bytes.buffer);

    view.setUint32(SET_UINT32_8, SET_UINT32_13);
    view.setUint32(SET_UINT32_12, SET_UINT32_1229472850);
    view.setUint32(SET_UINT32_16, width);
    view.setUint32(SET_UINT32_20, height);

    return bytes;
}

function webp(chunk: string, payload: Uint8Array): Uint8Array {
    const bytes = new Uint8Array(BYTES_20 + payload.length + (payload.length % BYTES_2));

    bytes.set(new TextEncoder().encode(RIFF));
    bytes.set(new TextEncoder().encode(WEBP), SET_8);
    bytes.set(new TextEncoder().encode(chunk), SET_12);

    const view = new DataView(bytes.buffer);

    view.setUint32(SET_UINT32_4, bytes.length - BYTES_LENGTH_8, true);
    view.setUint32(SET_UINT32_16, payload.length, true);
    bytes.set(payload, SET_20);

    return bytes;
}

describe('photo input validation', () => {
    it.each([
        [EACH_256, EACH_256],
        [EACH_1920, EACH_1080],
        [EACH_4000, EACH_3000],
        [EACH_8192, EACH_4096],
    ])('accepts ordinary %i × %i photos', async (width, height) => {
        expect(await inspectPhoto(file(png(width, height), 'image/png', 'photo.PNG'))).toBeUndefined();
    });

    it.each([
        [EACH_255, EACH_256],
        [EACH_9000, EACH_1000],
        [EACH_8192, EACH_8192],
        [EACH_1600, EACH_256],
        [EACH_0, EACH_800],
    ])('rejects unsuitable %i × %i dimensions before decoding', async (width, height) => {
        expect(await inspectPhoto(file(png(width, height), 'image/png', 'photo.png'))).toBe('invalidDimensions');
    });

    it('reads JPEG dimensions after metadata, including progressive photos', async () => {
        const jpeg = new Uint8Array([
            JPEG_255,
            JPEG_216,
            JPEG_255,
            JPEG_225,
            JPEG_0,
            JPEG_4,
            JPEG_0,
            JPEG_0,
            JPEG_255,
            JPEG_194,
            JPEG_0,
            JPEG_8,
            JPEG_8,
            JPEG_4,
            JPEG_56,
            JPEG_7,
            JPEG_128,
            JPEG_3,
        ]);

        expect(await inspectPhoto(file(jpeg, 'image/jpeg', 'photo.jpeg'))).toBeUndefined();
    });

    it('accepts lossy, lossless and extended still WebP headers', async () => {
        const lossy = new Uint8Array([
            LOSSY_0,
            LOSSY_0,
            LOSSY_0,
            LOSSY_157,
            LOSSY_1,
            LOSSY_42,
            LOSSY_0,
            LOSSY_4,
            LOSSY_0,
            LOSSY_3,
        ]);

        expect(await inspectPhoto(file(webp('VP8 ', lossy), 'image/webp', 'photo.webp'))).toBeUndefined();

        const lossless = new Uint8Array(LOSSLESS_5);

        lossless[LOSSLESS_0_0] = LOSSLESS_0_47;
        new DataView(lossless.buffer).setUint32(SET_UINT32_1, VALUE_1023 | (VALUE_767 << VALUE_14), true);
        expect(await inspectPhoto(file(webp(VP8L, lossless), 'image/webp', 'photo.webp'))).toBeUndefined();

        const extended = new Uint8Array([
            EXTENDED_0,
            EXTENDED_0,
            EXTENDED_0,
            EXTENDED_0,
            EXTENDED_255,
            EXTENDED_3,
            EXTENDED_0,
            EXTENDED_255,
            EXTENDED_2,
            EXTENDED_0,
        ]);

        expect(await inspectPhoto(file(webp(VP8X, extended), 'image/webp', 'photo.webp'))).toBeUndefined();
        extended[EXTENDED_0_0] = EXTENDED_0_2;
        expect(await inspectPhoto(file(webp(VP8X, extended), 'image/webp', 'photo.webp'))).toBe('invalidFile');
    });

    it('rejects renamed files, mismatched MIME, truncated headers and oversized input', async () => {
        expect(await inspectPhoto(file(png(PNG_512, PNG_512), 'image/jpeg', 'photo.jpg'))).toBe('invalidFile');
        expect(await inspectPhoto(file(png(PNG_512, PNG_512), 'image/png', 'photo.svg'))).toBe('invalidFile');
        expect(await inspectPhoto(file(new TextEncoder().encode('<svg/>'), 'image/jpeg', 'photo.jpg'))).toBe(
            'invalidFile',
        );
        expect(
            await inspectPhoto(file(new Uint8Array([FILE_255, FILE_216, FILE_255]), 'image/jpeg', 'photo.jpg')),
        ).toBe('invalidFile');

        const oversized = file(png(OVERSIZED_512, OVERSIZED_512), 'image/png', 'photo.png');

        Object.defineProperty(oversized, 'size', {
            value: VALUE_10 * VALUE_1024 * VALUE_1024 + MIN_VALUE_LENGTH,
        });
        expect(await inspectPhoto(oversized)).toBe('fileTooLarge');
        expect(isPhotoSizeAllowed(Number.NaN, IS_PHOTO_SIZE_ALLOWED_512)).toBe(false);
    });
});
