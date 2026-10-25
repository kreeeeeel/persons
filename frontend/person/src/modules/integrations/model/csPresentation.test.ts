import { expect, it } from 'vitest';
import { csMapImage, csRankImage, personalPerformanceTone } from '@/modules/integrations/model/csPresentation';
import { previewCsMatches } from '@/modules/integrations/model/previewCsMatches';

it('uses safe map fallbacks and renders Premier rank as an image', () => {
    expect(csMapImage('../../private')).toBe('/assets/integrations/leetify/maps/unknown.svg');
    expect(csRankImage(previewCsMatches[0])).toMatch(/^data:image\/svg\+xml,/);
    expect(decodeURIComponent(csRankImage(previewCsMatches[0]))).toContain('18,500');
    expect(csRankImage({ ...previewCsMatches[0], rank: undefined })).toMatch(/unknown.png$/);
});

it.each([1, 9, 18])('uses the separate Wingman emblem for rank %s', (rank) => {
    expect(csRankImage({ ...previewCsMatches[0], mode: 'WINGMAN', rank })).toBe(
        `/assets/integrations/leetify/ranks/wingman-${rank}.png`,
    );
    expect(csRankImage({ ...previewCsMatches[0], mode: 'COMPETITIVE', rank })).toBe(
        `/assets/integrations/leetify/ranks/competitive-${rank}.png`,
    );
});

it.each([1, 9, 10])('uses the original FACEIT image for level %s independently of matchmaking rank', (faceitLevel) => {
    expect(csRankImage({ ...previewCsMatches[0], mode: 'FACEIT', faceitLevel })).toBe(
        `/assets/integrations/leetify/ranks/faceit-${faceitLevel}.png`,
    );
});

it.each([undefined, 0, 19, 2.5])('falls back for unavailable or invalid Wingman rank %s', (rank) => {
    expect(csRankImage({ ...previewCsMatches[0], mode: 'WINGMAN', rank })).toMatch(/unknown.png$/);
});

it.each([undefined, 0, 11, 2.5])('falls back for unavailable or invalid FACEIT level %s', (faceitLevel) => {
    expect(csRankImage({ ...previewCsMatches[0], mode: 'FACEIT', faceitLevel })).toMatch(/unknown.png$/);
});

it.each([
    [-8, 'poor'],
    [-3, 'subpar'],
    [0, 'average'],
    [4.2, 'good'],
    [8, 'great'],
    [undefined, 'unknown'],
] as const)('matches Leetify performance bands for %s', (value, tone) =>
    expect(personalPerformanceTone(value)).toBe(tone),
);
