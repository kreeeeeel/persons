import { beforeEach, expect, it, vi } from 'vitest';
import { ResponseError } from '@persons/id-client';
import { currentUser } from '@/modules/account/server/currentUser';

const mocks = vi.hoisted(() => ({ has: vi.fn(), getMe: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ has: mocks.has }) }));
vi.mock('@/shared/api/server', () => ({ idApi: async () => ({ getMe: mocks.getMe }) }));

beforeEach(() => vi.clearAllMocks());

it('does not request ID for anonymous visitors', async () => {
    mocks.has.mockReturnValue(false);

    expect(await currentUser()).toBeNull();
    expect(mocks.getMe).not.toHaveBeenCalled();
});

it('treats a revoked session as anonymous', async () => {
    mocks.has.mockReturnValue(true);
    mocks.getMe.mockRejectedValue(new ResponseError(new Response(null, { status: 401 })));

    expect(await currentUser()).toBeNull();
});

it('does not disguise an unavailable backend as a signed-out account', async () => {
    mocks.has.mockReturnValue(true);
    const error = new ResponseError(new Response(null, { status: 503 }));
    mocks.getMe.mockRejectedValue(error);

    await expect(currentUser()).rejects.toBe(error);
});
