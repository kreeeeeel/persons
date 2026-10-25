import { beforeEach, expect, it, vi } from 'vitest';
import { changeAvatar } from '@/modules/account/actions/changeAvatar';

const backend = vi.hoisted(() => ({ change: vi.fn(), api: vi.fn() }));
vi.mock('@/shared/api/server', () => ({ idApi: backend.api, safeError: async () => 'UNAUTHORIZED' }));
beforeEach(() => {
    vi.resetAllMocks();
    backend.api.mockResolvedValue({ changeAvatar: backend.change });
});

it.each([
    'https://example.com/avatar.jpg',
    'data:image/png;base64,YQ==',
    'data:image/jpeg;base64,!!!',
    'data:image/jpeg;base64,' + 'a'.repeat(400024),
])('rejects invalid images before contacting ID', async (image) => {
    expect(await changeAvatar(image)).toEqual({ ok: false, code: 'INVALID_AVATAR' });
    expect(backend.api).not.toHaveBeenCalled();
});

it('saves through the authenticated ID client and preserves typed errors', async () => {
    const avatarBase64 = 'data:image/jpeg;base64,YQ==';
    expect(await changeAvatar(avatarBase64)).toEqual({ ok: true, data: undefined });
    expect(backend.change).toHaveBeenCalledWith({ changeAvatar: { avatarBase64 } });
    backend.change.mockRejectedValue(new Error('expired'));
    expect(await changeAvatar(avatarBase64)).toEqual({ ok: false, code: 'UNAUTHORIZED' });
});
