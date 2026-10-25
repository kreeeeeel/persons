import type { Area } from 'react-easy-crop';
import { isPhotoSizeAllowed } from '@persons/photo-editor/image';

const RADIANS_180 = 180;
const WIDTH_2 = 2;
const HEIGHT_2 = 2;
const SCALE_1 = 1;
const IMAGE_NATURAL_WIDTH_2 = 2;
const IMAGE_NATURAL_HEIGHT_2 = 2;
const OUTPUT_WIDTH_384 = 384;
const OUTPUT_HEIGHT_384 = 384;
const FILL_RECT_0 = 0;
const FILL_RECT_384 = 384;
const DRAW_IMAGE_0 = 0;
const DRAW_IMAGE_384 = 384;
const TO_DATA_URL_0_88 = 0.88;

export async function cropPhoto(
    source: string,
    crop: Area,
    rotation: number,
    flipX: boolean,
    flipY: boolean,
): Promise<string> {
    const image = new Image();

    image.src = source;
    await image.decode();

    if (!isPhotoSizeAllowed(image.naturalWidth, image.naturalHeight)) {
        throw new Error('Image dimensions exceed the limit');
    }

    const radians = (rotation * Math.PI) / RADIANS_180;
    const width = Math.round(
        Math.abs(Math.cos(radians) * image.naturalWidth) + Math.abs(Math.sin(radians) * image.naturalHeight),
    );
    const height = Math.round(
        Math.abs(Math.sin(radians) * image.naturalWidth) + Math.abs(Math.cos(radians) * image.naturalHeight),
    );
    const buffer = document.createElement('canvas');

    buffer.width = width;
    buffer.height = height;

    const context = buffer.getContext('2d');

    if (!context) {
        throw new Error('Canvas is unavailable');
    }

    context.translate(width / WIDTH_2, height / HEIGHT_2);
    context.rotate(radians);
    context.scale(flipX ? -SCALE_1 : SCALE_1, flipY ? -SCALE_1 : SCALE_1);
    context.drawImage(
        image,
        -image.naturalWidth / IMAGE_NATURAL_WIDTH_2,
        -image.naturalHeight / IMAGE_NATURAL_HEIGHT_2,
    );

    const output = document.createElement('canvas');

    output.width = OUTPUT_WIDTH_384;
    output.height = OUTPUT_HEIGHT_384;

    const result = output.getContext('2d');

    if (!result) {
        throw new Error('Canvas is unavailable');
    }

    result.fillStyle = '#ffffff';
    result.fillRect(FILL_RECT_0, FILL_RECT_0, FILL_RECT_384, FILL_RECT_384);
    result.drawImage(
        buffer,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        DRAW_IMAGE_0,
        DRAW_IMAGE_0,
        DRAW_IMAGE_384,
        DRAW_IMAGE_384,
    );

    return output.toDataURL('image/jpeg', TO_DATA_URL_0_88);
}
