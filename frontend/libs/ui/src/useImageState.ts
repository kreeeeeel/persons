'use client';

import { useEffect, useState } from 'react';

export function useImageState(src?: string) {
    const [loaded, setLoaded] = useState<string>();
    const [failed, setFailed] = useState<string>();

    useEffect(() => {
        if (!src) {
            return;
        }

        const image = new Image();

        image.onload = () => setLoaded(src);
        image.onerror = () => setFailed(src);
        image.src = src;

        return () => {
            image.onload = null;
            image.onerror = null;
        };
    }, [src]);

    return {
        ready: !src || loaded === src || failed === src,
        failed: Boolean(src && failed === src),
    };
}
