import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DynPropertyProvider } from '@persons/dynamic-properties';
import { useSiteSettings } from '@persons/person-domain/settings/useSiteSettings';
import { siteProperties } from '@persons/person-domain/settings/siteProperties';

const streams: FakeEventSource[] = [];
class FakeEventSource {
    onmessage?: (event: MessageEvent<string>) => void;
    onerror?: () => void;
    constructor() {
        streams.push(this);
    }
    close() {}
}
afterEach(() => {
    cleanup();
    Object.values(siteProperties).forEach((property) => property.reset());
    vi.unstubAllGlobals();
    streams.length = 0;
});

it('updates the site settings from pushed values and retains the last values on disconnect', async () => {
    const values = (email: string, marquee: boolean, revision: number) => [
        { key: 'legal.supportEmail', type: 'STRING', value: JSON.stringify(email), revision },
        { key: 'site.marqueeEnabled', type: 'BOOLEAN', value: JSON.stringify(marquee), revision },
    ];
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify(values('old@example.test', true, 1)))),
    );
    vi.stubGlobal('EventSource', FakeEventSource);
    const { result } = renderHook(() => useSiteSettings(), {
        wrapper: ({ children }) => (
            <DynPropertyProvider url="/settings" properties={Object.values(siteProperties)}>
                {children}
            </DynPropertyProvider>
        ),
    });
    await waitFor(() => expect(result.current.data?.supportEmail).toBe('old@example.test'));
    act(() =>
        streams[0]?.onmessage?.(
            new MessageEvent('message', { data: JSON.stringify(values('new@example.test', false, 2)) }),
        ),
    );
    expect(result.current.data?.supportEmail).toBe('new@example.test');
    expect(result.current.data?.marqueeEnabled).toBe(false);
    act(() => streams[0]?.onerror?.());
    expect(result.current.error).toBe('UNAVAILABLE');
    expect(result.current.data?.supportEmail).toBe('new@example.test');
});
