import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '@test/render';
import { AccessDialog } from '@/modules/users/components/AccessDialog/AccessDialog';
import { updateAccess } from '@/modules/users/actions/access';

vi.mock('@/modules/users/actions/access', () => ({ updateAccess: vi.fn() }));

afterEach(cleanup);

describe('account access editor', () => {
    it('keeps the editor open after a rejected access change', async () => {
        vi.mocked(updateAccess).mockResolvedValue({ ok: false, code: 'LAST_ADMINISTRATOR' });
        const saved = vi.fn();

        renderUi(
            <AccessDialog
                user={{
                    id: 'f3ba94d9-651f-42bd-aeb4-58bb8070cc40',
                    email: 'friend@example.test',
                    firstName: 'Крел',
                    lastName: 'Персонаж',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    createdAt: '2026-10-17T12:00:00Z',
                }}
                onClose={vi.fn()}
                onSaved={saved}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

        expect(await screen.findByText('Нельзя отключить последнего администратора.')).toBeVisible();
        expect(screen.getByText(/friend@example.test/)).toBeVisible();
        expect(saved).not.toHaveBeenCalled();
    });
});
