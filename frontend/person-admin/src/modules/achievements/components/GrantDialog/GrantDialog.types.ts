import type { Achievement } from '@persons/person-client';

export interface GrantDialogProps {
    readonly achievement: Achievement;
    readonly onClose: () => void;
    readonly onGranted: (count: number) => void;
}
