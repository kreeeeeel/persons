import type { HeaderUser } from "@persons/person-domain/account/model/HeaderUser";

export interface SettingsCenterProps {
    readonly user: HeaderUser;
    readonly showMarqueeSetting?: boolean;
    readonly avatar?: string;
    readonly onAvatarSaved: (image: string) => void;
    readonly onClose: () => void;
}
