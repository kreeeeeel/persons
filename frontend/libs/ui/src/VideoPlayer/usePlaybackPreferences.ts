'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { PlaybackPreferences } from '@persons/ui/VideoPlayer/PlaybackPreferences.types';
import {
    PLAYBACK_CHANGE_EVENT,
    PLAYBACK_STORAGE_KEY,
    parsePlaybackPreferences,
} from '@persons/ui/VideoPlayer/playbackPreferences';

function subscribe(notify: () => void) {
    window.addEventListener('storage', notify);
    window.addEventListener(PLAYBACK_CHANGE_EVENT, notify);
    return () => {
        window.removeEventListener('storage', notify);
        window.removeEventListener(PLAYBACK_CHANGE_EVENT, notify);
    };
}

function snapshot() {
    try {
        return window.localStorage.getItem(PLAYBACK_STORAGE_KEY);
    } catch {
        return null;
    }
}

function serverSnapshot() {
    return null;
}

export function usePlaybackPreferences() {
    const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const preferences = useMemo(() => parsePlaybackPreferences(stored), [stored]);

    function update(next: PlaybackPreferences): boolean {
        try {
            window.localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new Event(PLAYBACK_CHANGE_EVENT));
            return true;
        } catch {
            return false;
        }
    }

    return { preferences, update };
}
