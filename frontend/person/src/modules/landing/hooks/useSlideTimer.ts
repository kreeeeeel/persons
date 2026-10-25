'use client';

import { useEffect, useRef, useState } from 'react';

export function useSlideTimer(slide: string, enabled: boolean, duration: number, onAdvance: () => void) {
    const [visible, setVisible] = useState(true);
    const elapsed = useRef(0);
    const previousSlide = useRef(slide);
    const running = enabled && visible;

    useEffect(() => {
        const update = () => setVisible(document.visibilityState === 'visible');
        update();
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);

    useEffect(() => {
        if (previousSlide.current !== slide) {
            previousSlide.current = slide;
            elapsed.current = 0;
        }
        if (!running) {
            return;
        }

        const started = performance.now();
        const timer = window.setTimeout(onAdvance, Math.max(0, duration - elapsed.current));
        return () => {
            window.clearTimeout(timer);
            elapsed.current = Math.min(duration, elapsed.current + performance.now() - started);
        };
    }, [slide, running, duration, onAdvance]);

    return running;
}
