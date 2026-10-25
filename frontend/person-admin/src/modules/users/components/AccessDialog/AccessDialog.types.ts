import type { BrowserAdminUser } from '@/modules/users/model/BrowserAdminUser';

export interface AccessDialogProps {
    readonly user: BrowserAdminUser;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}
