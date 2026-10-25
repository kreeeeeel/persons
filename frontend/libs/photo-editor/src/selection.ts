import type { Area } from 'react-easy-crop';
import type {
    CropCorner,
    CropRegion,
} from '@persons/photo-editor/PhotoEditor/components/CropSelection/CropSelection.types';

const X_0 = 0;
const X_1 = 1;
const Y_0 = 0;
const Y_1 = 1;
const ANCHOR_X_0 = 0;
const ANCHOR_Y_0 = 0;
const DELTA_2 = 2;
const MAXIMUM_1 = 1;

const MIN_SELECTION_SIZE = 0.24;

export function moveSelection(region: CropRegion, dx: number, dy: number): CropRegion {
    return {
        ...region,
        x: Math.max(X_0, Math.min(X_1 - region.size, region.x + dx)),
        y: Math.max(Y_0, Math.min(Y_1 - region.size, region.y + dy)),
    };
}

export function resizeSelection(region: CropRegion, corner: CropCorner, dx: number, dy: number): CropRegion {
    const left = corner === 'topLeft' || corner === 'bottomLeft';
    const top = corner === 'topLeft' || corner === 'topRight';
    const anchorX = region.x + (left ? region.size : ANCHOR_X_0);
    const anchorY = region.y + (top ? region.size : ANCHOR_Y_0);
    const delta = ((left ? -dx : dx) + (top ? -dy : dy)) / DELTA_2;
    const maximum = Math.min(left ? anchorX : MAXIMUM_1 - anchorX, top ? anchorY : MAXIMUM_1 - anchorY);
    const size = Math.min(maximum, Math.max(MIN_SELECTION_SIZE, region.size + delta));

    return {
        x: left ? anchorX - size : anchorX,
        y: top ? anchorY - size : anchorY,
        size,
    };
}

export function selectedArea(viewport: Area, region: CropRegion): Area {
    return {
        x: viewport.x + viewport.width * region.x,
        y: viewport.y + viewport.height * region.y,
        width: viewport.width * region.size,
        height: viewport.height * region.size,
    };
}
