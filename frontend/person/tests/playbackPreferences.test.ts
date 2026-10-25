import { expect, it } from 'vitest';
import {
    DEFAULT_PLAYBACK_PREFERENCES,
    parsePlaybackPreferences,
    preferredVideoSource,
} from '@persons/ui/VideoPlayer/playbackPreferences';

it.each([null, '', '{broken', 'null', '12', '[]'])('uses safe defaults for invalid preferences: %s', (value) => {
    expect(parsePlaybackPreferences(value)).toEqual(DEFAULT_PLAYBACK_PREFERENCES);
});

it('validates each saved preference independently', () => {
    expect(
        parsePlaybackPreferences(JSON.stringify({ autoplay: true, muted: 'true', quality: '1080', speed: 9 })),
    ).toEqual({
        autoplay: true,
        muted: false,
        quality: '1080',
        speed: 1,
        volume: 50,
    });
});

it('chooses the best available quality below the preference and falls back safely', () => {
    const sources = [
        { src: '1080.mp4', label: '1080p' },
        { src: '480.mp4', label: '480p' },
    ];
    expect(preferredVideoSource('original.mp4', sources, '720')).toBe('480.mp4');
    expect(preferredVideoSource('original.mp4', sources, '360')).toBe('480.mp4');
    expect(preferredVideoSource('original.mp4', sources, 'original')).toBe('original.mp4');
    expect(preferredVideoSource('original.mp4', [], '720')).toBe('original.mp4');
});

it.each([-1, 101, '50', null])('defaults invalid volume %s to half volume', (volume) => {
    expect(parsePlaybackPreferences(JSON.stringify({ volume })).volume).toBe(50);
});

it.each([0, 35, 100])('keeps a valid saved volume of %s', (volume) => {
    expect(parsePlaybackPreferences(JSON.stringify({ volume })).volume).toBe(volume);
});
