import type { BrowserAdminUser } from '@/modules/users/model/BrowserAdminUser';

export interface UserProfileDialogProps {
    readonly user: BrowserAdminUser;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}
