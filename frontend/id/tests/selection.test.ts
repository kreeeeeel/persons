import { describe, expect, it } from 'vitest';
import { moveSelection, resizeSelection, selectedArea } from '@persons/photo-editor/selection';

const X_0_2 = 0.2;
const Y_0_2 = 0.2;
const SIZE_0_6 = 0.6;
const RESIZED_0_1 = 0.1;
const TO_BE_CLOSE_TO_0_5 = 0.5;
const RESIZED_X_0 = 0;
const REGION_X_0 = 0;
const RESIZED_Y_0 = 0;
const REGION_Y_0 = 0;
const Y_0_1 = 0.1;
const RESIZE_SELECTION_10 = 10;
const TO_BE_0_24 = 0.24;
const TO_BE_CLOSE_TO_0_8 = 0.8;
const EXPANDED_10 = 10;
const TO_BE_CLOSE_TO_0 = 0;
const TO_BE_GREATER_THAN_OR_EQUAL_0 = 0;
const MOVE_SELECTION_1 = 1;
const X_0 = 0;
const Y_0_4 = 0.4;
const X_0_4 = 0.4;
const Y_0 = 0;
const X_120 = 120;
const Y_40 = 40;
const WIDTH_800 = 800;
const HEIGHT_800 = 800;
const X_0_25 = 0.25;
const SIZE_0_5 = 0.5;
const X_320 = 320;
const Y_120 = 120;
const WIDTH_400 = 400;
const HEIGHT_400 = 400;

describe('avatar crop selection', () => {
    it('resizes each corner while anchoring the opposite corner and keeping a square', () => {
        const region = { x: X_0_2, y: Y_0_2, size: SIZE_0_6 };
        const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;

        for (const corner of corners) {
            const left = corner === 'topLeft' || corner === 'bottomLeft';
            const top = corner === 'topLeft' || corner === 'topRight';
            const resized = resizeSelection(
                region,
                corner,
                left ? RESIZED_0_1 : -RESIZED_0_1,
                top ? RESIZED_0_1 : -RESIZED_0_1,
            );

            expect(resized.size).toBeCloseTo(TO_BE_CLOSE_TO_0_5);
            expect(resized.x + (left ? resized.size : RESIZED_X_0)).toBeCloseTo(
                region.x + (left ? region.size : REGION_X_0),
            );
            expect(resized.y + (top ? resized.size : RESIZED_Y_0)).toBeCloseTo(
                region.y + (top ? region.size : REGION_Y_0),
            );
        }
    });

    it('limits shrinking and growth to the viewport without inverting the selection', () => {
        const region = { x: X_0_2, y: Y_0_1, size: SIZE_0_6 };

        expect(resizeSelection(region, 'bottomRight', -RESIZE_SELECTION_10, -RESIZE_SELECTION_10).size).toBe(
            TO_BE_0_24,
        );
        expect(resizeSelection(region, 'bottomRight', RESIZE_SELECTION_10, RESIZE_SELECTION_10).size).toBeCloseTo(
            TO_BE_CLOSE_TO_0_8,
        );

        const expanded = resizeSelection(region, 'topLeft', -EXPANDED_10, -EXPANDED_10);

        expect(expanded.y).toBeCloseTo(TO_BE_CLOSE_TO_0);
        expect(expanded.x).toBeGreaterThanOrEqual(TO_BE_GREATER_THAN_OR_EQUAL_0);
    });

    it('moves the region without resizing it and keeps it within all four edges', () => {
        const region = { x: X_0_2, y: Y_0_1, size: SIZE_0_6 };

        expect(moveSelection(region, -MOVE_SELECTION_1, MOVE_SELECTION_1)).toEqual({
            x: X_0,
            y: Y_0_4,
            size: SIZE_0_6,
        });
        expect(moveSelection(region, MOVE_SELECTION_1, -MOVE_SELECTION_1)).toEqual({
            x: X_0_4,
            y: Y_0,
            size: SIZE_0_6,
        });
    });

    it('exports the selected region in source pixels at its current position', () => {
        const viewport = { x: X_120, y: Y_40, width: WIDTH_800, height: HEIGHT_800 };

        expect(selectedArea(viewport, { x: X_0_25, y: Y_0_1, size: SIZE_0_5 })).toEqual({
            x: X_320,
            y: Y_120,
            width: WIDTH_400,
            height: HEIGHT_400,
        });
    });
});
