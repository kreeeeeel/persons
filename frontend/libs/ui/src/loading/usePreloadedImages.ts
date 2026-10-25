'use client';

import { useEffect, useState } from 'react';
import { preloadImage } from '@persons/ui/loading/preloadImages';

export const IMAGE_PRELOAD_TIMEOUT_MS = 12000;

export function usePreloadedImages(sources: readonly string[], enabled = true) {
    const key = JSON.stringify(sources);
    const [completedKey, setCompletedKey] = useState<string>();

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let active = true;
        const complete = () => {
            if (active) {
                setCompletedKey(key);
            }
        };
        const timeout = window.setTimeout(complete, IMAGE_PRELOAD_TIMEOUT_MS);
        const images: string[] = JSON.parse(key);

        void Promise.allSettled(images.map(preloadImage)).then(() => {
            window.clearTimeout(timeout);
            complete();
        });

        return () => {
            active = false;
            window.clearTimeout(timeout);
        };
    }, [key, enabled]);

    return enabled && completedKey === key;
}
