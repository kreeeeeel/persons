const MIN_IMAGE_DIMENSION = 256;
const MAX_IMAGE_DIMENSION = 8192;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_ASPECT_RATIO = 4;
const EMPTY_FILE_BYTES = 0;
const MAX_FILE_MEBIBYTES = 10;
const BYTES_PER_KIBIBYTE = 1024;
const PNG_SIGNATURE_LEAD = 137;
const ASCII_P = 80;
const ASCII_N = 78;
const ASCII_G = 71;
const CARRIAGE_RETURN = 13;
const LINE_FEED = 10;
const END_OF_FILE = 26;
const MIN_PNG_HEADER_BYTES = 33;
const PNG_CHUNK_LENGTH_OFFSET = 8;
const PNG_HEADER_CHUNK_BYTES = 13;
const PNG_CHUNK_TYPE_OFFSET = 12;
const PNG_HEADER_CHUNK_TAG = 0x49484452;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const JPEG_PREFIX_OFFSET = 0;
const JPEG_MARKER_PREFIX = 0xff;
const JPEG_START_OFFSET = 1;
const JPEG_START_MARKER = 0xd8;
const JPEG_MARKER_BYTES = 2;
const JPEG_SEGMENT_HEADER_BYTES = 4;
const JPEG_MARKER_TYPE_OFFSET = 1;
const SINGLE_BYTE = 1;
const JPEG_SCAN_START_MARKER = 0xda;
const JPEG_END_MARKER = 0xd9;
const JPEG_LENGTH_FIELD_BYTES = 2;
const JPEG_FIRST_FRAME_MARKER = 0xc0;
const JPEG_LAST_FRAME_MARKER = 0xcf;
const JPEG_HUFFMAN_TABLE_MARKER = 0xc4;
const JPEG_EXTENSION_MARKER = 0xc8;
const JPEG_ARITHMETIC_TABLE_MARKER = 0xcc;
const MIN_JPEG_FRAME_BYTES = 8;
const JPEG_FRAME_WIDTH_OFFSET = 5;
const JPEG_FRAME_HEIGHT_OFFSET = 3;
const MIN_WEBP_HEADER_BYTES = 20;
const RIFF_TAG_OFFSET = 0;
const RIFF_TAG = 0x52494646;
const WEBP_TAG = 0x57454250;
const RIFF_SIZE_OFFSET = 4;
const RIFF_HEADER_BYTES = 8;
const WEBP_FIRST_CHUNK_OFFSET = 12;
const WEBP_CHUNK_HEADER_BYTES = 8;
const WEBP_CHUNK_SIZE_OFFSET = 4;
const WEBP_EXTENDED_CHUNK_TAG = 0x56503858;
const MIN_WEBP_FRAME_BYTES = 10;
const WEBP_ANIMATION_FLAG = 0x02;
const DIMENSION_INCREMENT = 1;
const WEBP_EXTENDED_WIDTH_OFFSET = 4;
const WEBP_EXTENDED_DIMENSION_MASK = 0xffffff;
const WEBP_EXTENDED_HEIGHT_OFFSET = 7;
const BITS_PER_BYTE = 8;
const WEBP_EXTENDED_HEIGHT_MIDDLE_OFFSET = 8;
const WEBP_LOSSY_HEIGHT_OFFSET = 8;
const WEBP_TAG_OFFSET = 8;
const WEBP_EXTENDED_HEIGHT_HIGH_OFFSET = 9;
const TWO_BYTE_SHIFT = 16;
const WEBP_LOSSY_CHUNK_TAG = 0x56503820;
const WEBP_LOSSY_SIGNATURE_OFFSET = 3;
const WEBP_LOSSY_SIGNATURE_FIRST = 0x9d;
const WEBP_LOSSY_SIGNATURE_SECOND_OFFSET = 4;
const WEBP_LOSSY_SIGNATURE_SECOND = 0x01;
const WEBP_LOSSY_SIGNATURE_THIRD_OFFSET = 5;
const WEBP_LOSSY_SIGNATURE_THIRD = 0x2a;
const WEBP_LOSSY_WIDTH_OFFSET = 6;
const WEBP_FRAME_DIMENSION_MASK = 0x3fff;
const WEBP_LOSSLESS_CHUNK_TAG = 0x5650384c;
const MIN_WEBP_LOSSLESS_FRAME_BYTES = 5;
const WEBP_LOSSLESS_SIGNATURE = 0x2f;
const WEBP_LOSSLESS_DIMENSIONS_OFFSET = 1;
const WEBP_LOSSLESS_HEIGHT_SHIFT = 14;
export type PhotoIssue = 'invalidFile' | 'fileTooLarge' | 'invalidDimensions';

const formats: Record<string, RegExp> = {
    'image/jpeg': /\.jpe?g$/i,
    'image/png': /\.png$/i,
    'image/webp': /\.webp$/i,
};

export function isPhotoSizeAllowed(width: number, height: number): boolean {
    return (
        Number.isInteger(width) &&
        Number.isInteger(height) &&
        Math.min(width, height) >= MIN_IMAGE_DIMENSION &&
        Math.max(width, height) <= MAX_IMAGE_DIMENSION &&
        width * height <= MAX_IMAGE_PIXELS &&
        Math.max(width, height) / Math.min(width, height) <= MAX_ASPECT_RATIO
    );
}

export async function inspectPhoto(file: File): Promise<PhotoIssue | undefined> {
    if (!formats[file.type]?.test(file.name) || file.size === EMPTY_FILE_BYTES) {
        return 'invalidFile';
    }

    if (file.size > MAX_FILE_MEBIBYTES * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE) {
        return 'fileTooLarge';
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const dimensions = readDimensions(bytes, file.type);

    if (!dimensions) {
        return 'invalidFile';
    }

    return isPhotoSizeAllowed(dimensions.width, dimensions.height) ? undefined : 'invalidDimensions';
}

function readDimensions(bytes: Uint8Array, format: string) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (format === 'image/png') {
        const signature = [
            PNG_SIGNATURE_LEAD,
            ASCII_P,
            ASCII_N,
            ASCII_G,
            CARRIAGE_RETURN,
            LINE_FEED,
            END_OF_FILE,
            LINE_FEED,
        ];

        if (
            bytes.length >= MIN_PNG_HEADER_BYTES &&
            signature.every((value, index) => bytes[index] === value) &&
            view.getUint32(PNG_CHUNK_LENGTH_OFFSET) === PNG_HEADER_CHUNK_BYTES &&
            view.getUint32(PNG_CHUNK_TYPE_OFFSET) === PNG_HEADER_CHUNK_TAG
        ) {
            return {
                width: view.getUint32(PNG_WIDTH_OFFSET),
                height: view.getUint32(PNG_HEIGHT_OFFSET),
            };
        }
    }

    if (
        format === 'image/jpeg' &&
        bytes[JPEG_PREFIX_OFFSET] === JPEG_MARKER_PREFIX &&
        bytes[JPEG_START_OFFSET] === JPEG_START_MARKER
    ) {
        let offset = JPEG_MARKER_BYTES;

        while (offset + JPEG_SEGMENT_HEADER_BYTES <= bytes.length) {
            if (bytes[offset] !== JPEG_MARKER_PREFIX) {
                return undefined;
            }

            const marker = bytes[offset + JPEG_MARKER_TYPE_OFFSET];

            offset += JPEG_MARKER_BYTES;

            if (marker === JPEG_MARKER_PREFIX) {
                offset -= SINGLE_BYTE;
                continue;
            }

            if (marker === JPEG_SCAN_START_MARKER || marker === JPEG_END_MARKER) {
                return undefined;
            }

            const length = view.getUint16(offset);

            if (length < JPEG_LENGTH_FIELD_BYTES || offset + length > bytes.length) {
                return undefined;
            }

            if (
                marker >= JPEG_FIRST_FRAME_MARKER &&
                marker <= JPEG_LAST_FRAME_MARKER &&
                ![JPEG_HUFFMAN_TABLE_MARKER, JPEG_EXTENSION_MARKER, JPEG_ARITHMETIC_TABLE_MARKER].includes(marker) &&
                length >= MIN_JPEG_FRAME_BYTES
            ) {
                return {
                    width: view.getUint16(offset + JPEG_FRAME_WIDTH_OFFSET),
                    height: view.getUint16(offset + JPEG_FRAME_HEIGHT_OFFSET),
                };
            }

            offset += length;
        }
    }

    if (
        format === 'image/webp' &&
        bytes.length >= MIN_WEBP_HEADER_BYTES &&
        view.getUint32(RIFF_TAG_OFFSET) === RIFF_TAG &&
        view.getUint32(WEBP_TAG_OFFSET) === WEBP_TAG &&
        view.getUint32(RIFF_SIZE_OFFSET, true) + RIFF_HEADER_BYTES <= bytes.length
    ) {
        let offset = WEBP_FIRST_CHUNK_OFFSET;

        while (offset + WEBP_CHUNK_HEADER_BYTES <= bytes.length) {
            const chunk = view.getUint32(offset);
            const length = view.getUint32(offset + WEBP_CHUNK_SIZE_OFFSET, true);
            const data = offset + WEBP_CHUNK_HEADER_BYTES;

            if (data + length > bytes.length) {
                return undefined;
            }

            if (chunk === WEBP_EXTENDED_CHUNK_TAG && length >= MIN_WEBP_FRAME_BYTES) {
                if (bytes[data] & WEBP_ANIMATION_FLAG) {
                    return undefined;
                }

                return {
                    width:
                        DIMENSION_INCREMENT +
                        (view.getUint32(data + WEBP_EXTENDED_WIDTH_OFFSET, true) & WEBP_EXTENDED_DIMENSION_MASK),
                    height:
                        DIMENSION_INCREMENT +
                        bytes[data + WEBP_EXTENDED_HEIGHT_OFFSET] +
                        (bytes[data + WEBP_EXTENDED_HEIGHT_MIDDLE_OFFSET] << BITS_PER_BYTE) +
                        (bytes[data + WEBP_EXTENDED_HEIGHT_HIGH_OFFSET] << TWO_BYTE_SHIFT),
                };
            }

            if (
                chunk === WEBP_LOSSY_CHUNK_TAG &&
                length >= MIN_WEBP_FRAME_BYTES &&
                bytes[data + WEBP_LOSSY_SIGNATURE_OFFSET] === WEBP_LOSSY_SIGNATURE_FIRST &&
                bytes[data + WEBP_LOSSY_SIGNATURE_SECOND_OFFSET] === WEBP_LOSSY_SIGNATURE_SECOND &&
                bytes[data + WEBP_LOSSY_SIGNATURE_THIRD_OFFSET] === WEBP_LOSSY_SIGNATURE_THIRD
            ) {
                return {
                    width: view.getUint16(data + WEBP_LOSSY_WIDTH_OFFSET, true) & WEBP_FRAME_DIMENSION_MASK,
                    height: view.getUint16(data + WEBP_LOSSY_HEIGHT_OFFSET, true) & WEBP_FRAME_DIMENSION_MASK,
                };
            }

            if (
                chunk === WEBP_LOSSLESS_CHUNK_TAG &&
                length >= MIN_WEBP_LOSSLESS_FRAME_BYTES &&
                bytes[data] === WEBP_LOSSLESS_SIGNATURE
            ) {
                const dimensions = view.getUint32(data + WEBP_LOSSLESS_DIMENSIONS_OFFSET, true);

                return {
                    width: DIMENSION_INCREMENT + (dimensions & WEBP_FRAME_DIMENSION_MASK),
                    height:
                        DIMENSION_INCREMENT + ((dimensions >>> WEBP_LOSSLESS_HEIGHT_SHIFT) & WEBP_FRAME_DIMENSION_MASK),
                };
            }

            offset = data + length + (length % JPEG_LENGTH_FIELD_BYTES);
        }
    }

    return undefined;
}
