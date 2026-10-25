'use client';

import { useSyncExternalStore } from 'react';

export const MARQUEE_STORAGE_KEY = 'PERSONS_MARQUEE_HIDDEN';
const CHANGE_EVENT = 'persons:marquee-preference';

function subscribe(notify: () => void) {
    window.addEventListener('storage', notify);
    window.addEventListener(CHANGE_EVENT, notify);

    return () => {
        window.removeEventListener('storage', notify);
        window.removeEventListener(CHANGE_EVENT, notify);
    };
}

function snapshot() {
    try {
        return window.localStorage.getItem(MARQUEE_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function serverSnapshot() {
    return false;
}

export function useMarqueePreference() {
    const hidden = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

    function setHidden(value: boolean): boolean {
        try {
            window.localStorage.setItem(MARQUEE_STORAGE_KEY, String(value));
            window.dispatchEvent(new Event(CHANGE_EVENT));
            return true;
        } catch {
            return false;
        }
    }

    return { hidden, setHidden };
}
