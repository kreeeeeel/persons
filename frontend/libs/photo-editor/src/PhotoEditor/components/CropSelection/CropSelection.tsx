'use client';

import { Box, Button } from '@gravity-ui/uikit';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslate } from '@persons/i18n';
import { moveSelection, resizeSelection } from '@persons/photo-editor/selection';
import type {
    CropCorner,
    CropRegion,
    CropSelectionProps,
} from '@persons/photo-editor/PhotoEditor/components/CropSelection/CropSelection.types';
import styles from '@persons/photo-editor/PhotoEditor/components/CropSelection/CropSelection.module.css';

const WHEEL_ZOOM_FACTOR = 0.002;
const PRIMARY_MOUSE_BUTTON = 0;
const SINGLE_POINTER = 1;
const PINCH_POINTER_COUNT = 2;
const DISTANCE_0 = 0;
const STEP_3 = 3;
const CONTROL_STEP = 1;
const DX_0 = 0;
const DY_0 = 0;
const LEFT_100 = 100;
const TOP_100 = 100;
const WIDTH_100 = 100;
const HEIGHT_100 = 100;

const CORNERS: CropCorner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const KEYBOARD_STEP = 0.02;

export function CropSelection({ region, disabled, onChange, onZoom }: CropSelectionProps) {
    const t = useTranslate('editor');
    const viewport = useRef<HTMLDivElement>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchDistance = useRef<number>(undefined);
    const gesture = useRef<{
        pointerId: number;
        x: number;
        y: number;
        width: number;
        region: CropRegion;
        corner?: CropCorner;
    }>(undefined);

    useEffect(() => {
        const element = viewport.current;

        function wheel(event: WheelEvent) {
            event.preventDefault();

            if (!disabled) {
                onZoom(Math.exp(-event.deltaY * WHEEL_ZOOM_FACTOR));
            }
        }

        element?.addEventListener('wheel', wheel, { passive: false });

        return () => element?.removeEventListener('wheel', wheel);
    }, [disabled, onZoom]);

    function start(event: PointerEvent<HTMLButtonElement>, corner?: CropCorner) {
        const bounds = viewport.current?.getBoundingClientRect();

        if (disabled || !bounds?.width || event.button !== PRIMARY_MOUSE_BUTTON) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        if (pointers.current.size > SINGLE_POINTER) {
            const [first, second] = [...pointers.current.values()];

            pinchDistance.current = Math.hypot(second.x - first.x, second.y - first.y);
            gesture.current = undefined;

            return;
        }

        gesture.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            width: bounds.width,
            region,
            corner,
        };
    }

    function move(event: PointerEvent<HTMLButtonElement>) {
        if (pointers.current.has(event.pointerId)) {
            pointers.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
        }
        if (pointers.current.size === PINCH_POINTER_COUNT && pinchDistance.current) {
            event.preventDefault();

            const [first, second] = [...pointers.current.values()];
            const distance = Math.hypot(second.x - first.x, second.y - first.y);

            if (distance > DISTANCE_0) {
                onZoom(distance / pinchDistance.current);
                pinchDistance.current = distance;
            }

            return;
        }

        const current = gesture.current;

        if (!current || current.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();

        const dx = (event.clientX - current.x) / current.width;
        const dy = (event.clientY - current.y) / current.width;

        onChange(
            current.corner
                ? resizeSelection(current.region, current.corner, dx, dy)
                : moveSelection(current.region, dx, dy),
        );
    }

    function stop(event: PointerEvent<HTMLButtonElement>) {
        pointers.current.delete(event.pointerId);
        pinchDistance.current = undefined;

        if (gesture.current?.pointerId === event.pointerId) {
            gesture.current = undefined;
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    function keyboard(event: KeyboardEvent<HTMLButtonElement>, corner?: CropCorner) {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            return;
        }

        event.preventDefault();

        const step = KEYBOARD_STEP * (event.shiftKey ? STEP_3 : CONTROL_STEP);
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : DX_0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : DY_0;

        onChange(corner ? resizeSelection(region, corner, dx, dy) : moveSelection(region, dx, dy));
    }

    const pointerHandlers = {
        onPointerMove: move,
        onPointerUp: stop,
        onPointerCancel: stop,
        onLostPointerCapture: () => {
            gesture.current = undefined;
            pointers.current.clear();
            pinchDistance.current = undefined;
        },
    };

    return (
        <Box ref={viewport} className={styles.viewport}>
            <Box
                className={styles.frame}
                role="group"
                aria-label={t('selection')}
                style={{
                    left: `${region.x * LEFT_100}%`,
                    top: `${region.y * TOP_100}%`,
                    width: `${region.size * WIDTH_100}%`,
                    height: `${region.size * HEIGHT_100}%`,
                }}
            >
                <Box className={styles.circle} aria-hidden />
                <Button
                    view="flat"
                    className={styles.move}
                    aria-label={t('moveSelection')}
                    disabled={disabled}
                    onPointerDown={(event) => start(event)}
                    onKeyDown={(event) => keyboard(event)}
                    {...pointerHandlers}
                />
                {CORNERS.map((corner) => (
                    <Button
                        key={corner}
                        view="flat"
                        className={`${styles.corner} ${styles[corner]}`}
                        aria-label={t(corner)}
                        disabled={disabled}
                        onPointerDown={(event) => start(event, corner)}
                        onKeyDown={(event) => keyboard(event, corner)}
                        {...pointerHandlers}
                    />
                ))}
            </Box>
        </Box>
    );
}
