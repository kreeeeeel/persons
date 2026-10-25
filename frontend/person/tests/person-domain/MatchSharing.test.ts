import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { contentShareLink, readSharedContent, updateContentQuery } from '@persons/person-domain/content/shareLink';
import { useContentLocation } from '@persons/person-domain/hooks/useContentLocation';

const CS_MATCH = '06e46ee0-68c1-4b2c-b3fa-d61ff3f6a6fd';
const DOTA_MATCH = '8000000001';

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
});

it.each([
    ['DOTA_MATCH', DOTA_MATCH, 'dotaMatch'],
    ['CS_MATCH', CS_MATCH, 'csMatch'],
] as const)('builds a durable public link to %s details', (kind, id, query) => {
    const link = new URL(contentShareLink('https://kreeeeeel.ru', 'vadim', kind, id));
    expect(link.pathname).toBe('/vadim');
    expect(link.searchParams.get(query)).toBe(id);
    expect(readSharedContent(link.search)).toEqual({ kind, id });
});

it.each([
    '',
    '?dotaMatch=',
    '?dotaMatch=0',
    '?dotaMatch=-1',
    '?dotaMatch=1.5',
    '?dotaMatch=12345678901234567890',
    '?csMatch=8000000001',
    `?dotaMatch=${DOTA_MATCH}&csMatch=${CS_MATCH}`,
    `?dotaMatch=${DOTA_MATCH}&dotaMatch=8000000002`,
    `?dotaMatch=${DOTA_MATCH}&photo=${CS_MATCH}`,
    `?csMatch=${CS_MATCH}&video=${CS_MATCH}`,
])('ignores malformed or ambiguous match links: %s', (search) => {
    expect(readSharedContent(search)).toBeUndefined();
});

it('replaces the selected content while preserving unrelated query values and the original URL', () => {
    const original = new URL(`https://kreeeeeel.ru/vadim?lang=en&photo=${CS_MATCH}`);
    const selected = updateContentQuery(original, 'DOTA_MATCH', DOTA_MATCH);
    expect(selected.search).toBe(`?lang=en&dotaMatch=${DOTA_MATCH}`);
    expect(original.searchParams.get('photo')).toBe(CS_MATCH);
    const next = updateContentQuery(selected, 'CS_MATCH', CS_MATCH);
    expect(next.search).toBe(`?lang=en&csMatch=${CS_MATCH}`);
    expect(updateContentQuery(next).search).toBe('?lang=en');
});

it('closes a directly loaded match without navigating away from its profile', async () => {
    window.history.replaceState({ existing: true }, '', `/vadim?lang=en&csMatch=${CS_MATCH}`);
    const back = vi.spyOn(window.history, 'back');
    const { result } = renderHook(() => useContentLocation('vadim'));
    expect(result.current.content).toEqual({ kind: 'CS_MATCH', id: CS_MATCH });
    act(() => result.current.close());
    await waitFor(() => expect(result.current.content).toBeUndefined());
    expect(window.location.pathname).toBe('/vadim');
    expect(window.location.search).toBe('?lang=en');
    expect(window.history.state).toEqual({ existing: true });
    expect(back).not.toHaveBeenCalled();
});

it('uses one match history entry and responds to browser navigation', () => {
    window.history.replaceState({ existing: true }, '', '/vadim?lang=ru');
    const push = vi.spyOn(window.history, 'pushState');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
        window.history.replaceState({ existing: true }, '', '/vadim?lang=ru');
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const { result } = renderHook(() => useContentLocation('vadim'));
    act(() => result.current.open('DOTA_MATCH', DOTA_MATCH));
    expect(result.current.content).toEqual({ kind: 'DOTA_MATCH', id: DOTA_MATCH });
    expect(window.history.state.existing).toBe(true);
    act(() => result.current.open('CS_MATCH', CS_MATCH));
    expect(result.current.content).toEqual({ kind: 'CS_MATCH', id: CS_MATCH });
    expect(push).toHaveBeenCalledOnce();
    act(() => result.current.close());
    expect(back).toHaveBeenCalledOnce();
    expect(result.current.content).toBeUndefined();
    act(() => {
        window.history.replaceState(null, '', `/vadim?csMatch=${CS_MATCH}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.content).toEqual({ kind: 'CS_MATCH', id: CS_MATCH });
});

it('ignores match links on a different profile and when the profile tag is unavailable', () => {
    window.history.replaceState(null, '', `/other?dotaMatch=${DOTA_MATCH}`);
    const { result } = renderHook(() => useContentLocation('vadim'));
    expect(result.current.content).toBeUndefined();
    const missingTag = renderHook(() => useContentLocation());
    expect(missingTag.result.current.content).toBeUndefined();
});
