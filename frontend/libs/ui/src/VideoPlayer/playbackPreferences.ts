import type { PlaybackPreferences } from '@persons/ui/VideoPlayer/PlaybackPreferences.types';
import type { VideoQuality } from '@persons/ui/VideoPlayer/VideoQuality';

export const PLAYBACK_STORAGE_KEY = 'PERSONS_PLAYBACK';
export const PLAYBACK_CHANGE_EVENT = 'persons:playback-preferences';
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const PLAYBACK_QUALITIES = ['original', '1080', '720', '480', '360'] as const;
export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferences = {
    autoplay: false,
    muted: false,
    quality: 'original',
    speed: 1,
    volume: 50,
};

export function parsePlaybackPreferences(value: string | null): PlaybackPreferences {
    try {
        const parsed: unknown = value ? JSON.parse(value) : null;
        if (!parsed || typeof parsed !== 'object') {
            return DEFAULT_PLAYBACK_PREFERENCES;
        }
        const candidate = parsed as Record<string, unknown>;
        return {
            autoplay: candidate.autoplay === true,
            muted: candidate.muted === true,
            quality: PLAYBACK_QUALITIES.find((quality) => quality === candidate.quality) ?? 'original',
            speed: PLAYBACK_SPEEDS.find((speed) => speed === candidate.speed) ?? 1,
            volume:
                typeof candidate.volume === 'number' &&
                Number.isFinite(candidate.volume) &&
                candidate.volume >= 0 &&
                candidate.volume <= 100
                    ? Math.round(candidate.volume)
                    : DEFAULT_PLAYBACK_PREFERENCES.volume,
        };
    } catch {
        return DEFAULT_PLAYBACK_PREFERENCES;
    }
}

export function preferredVideoSource(
    original: string,
    sources: readonly VideoQuality[],
    quality: PlaybackPreferences['quality'],
): string {
    if (quality === 'original') {
        return original;
    }
    const available = sources
        .map((source) => ({ ...source, height: Number(source.label.replace(/p$/, '')) }))
        .filter((source) => Number.isFinite(source.height) && source.height > 0)
        .sort((left, right) => left.height - right.height);
    return available.filter((source) => source.height <= Number(quality)).at(-1)?.src ?? available[0]?.src ?? original;
}
