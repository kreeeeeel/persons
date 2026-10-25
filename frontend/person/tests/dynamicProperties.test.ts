import { afterEach, expect, it, vi } from 'vitest';
import { DynPropertyFactory, DynPropertyClient } from '@persons/dynamic-properties';
import type { DynamicProperty } from '@persons/dynamic-properties';

const streams: FakeEventSource[] = [];
class FakeEventSource {
    onmessage?: (event: MessageEvent<string>) => void;
    onerror?: () => void;
    close = vi.fn();
    constructor(readonly url: string) {
        streams.push(this);
    }
}
afterEach(() => {
    streams.length = 0;
    vi.unstubAllGlobals();
});

it('bootstraps once from the configured URL, reads memory and applies pushed snapshots without polling', async () => {
    const enabled = DynPropertyFactory.createBoolean('frontend.test.enabled', true).description('Test').build();
    const record = (value: boolean, revision: number): DynamicProperty => ({
        key: enabled.definition.key,
        type: 'BOOLEAN',
        value: JSON.stringify(value),
        revision,
    });
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([record(false, 1)])));
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('EventSource', FakeEventSource);
    const client = new DynPropertyClient({ url: '/configuration', properties: [enabled] });
    await Promise.all([client.start(), client.start()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(enabled.value).toBe(false);
    expect(streams[0].url).toBe('/configuration/v1/dynamic-properties/events');
    for (let index = 0; index < 100; index++) {
        expect(enabled.value).toBe(false);
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    streams[0].onmessage?.(new MessageEvent('message', { data: JSON.stringify([record(true, 2)]) }));
    expect(enabled.value).toBe(true);
    streams[0].onmessage?.(new MessageEvent('message', { data: JSON.stringify([record(false, 1)]) }));
    expect(enabled.value).toBe(true);
    streams[0].onerror?.();
    expect(client.snapshot().error).toBeDefined();
    expect(enabled.value).toBe(true);
    client.close();
    expect(streams[0].close).toHaveBeenCalledOnce();
});

it('restores defaults when a declaration is removed and preserves SSR bootstrap values', () => {
    const property = DynPropertyFactory.createInteger('frontend.test.count', 12, 1, 60).build();
    property.apply({ key: property.definition.key, type: 'NUMBER', value: '36', revision: 2 });
    const client = new DynPropertyClient({
        url: '/configuration',
        properties: [property],
        initialValues: [{ key: property.definition.key, type: 'NUMBER', value: '24', revision: 1 }],
    });
    expect(client.serverValue(property)).toBe(24);
    expect(property.value).toBe(36);
    client.apply([]);
    expect(property.value).toBe(12);
    expect(() => property.apply({ key: property.definition.key, type: 'NUMBER', value: '0', revision: 2 })).toThrow();
});
