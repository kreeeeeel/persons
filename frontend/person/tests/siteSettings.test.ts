import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getMarqueeEnabled } from '@/shared/api/siteSettings';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/shared/api/person', () => ({ personApi: async () => ({ siteSettings: { getSiteSettings: api.get } }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

it.each([true, false])('uses the server visibility preference: %s', async (marqueeEnabled) => {
    api.get.mockResolvedValue({ marqueeEnabled });
    expect(await getMarqueeEnabled()).toBe(marqueeEnabled);
});

it('keeps optional notices hidden when settings are unavailable and reports the failure', async () => {
    api.get.mockRejectedValue(new Error('offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await getMarqueeEnabled()).toBe(false);
    expect(log).toHaveBeenCalledWith('Unable to load site interface settings', { cause: 'Error' });
});
