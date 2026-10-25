import type { HeaderUser } from "@persons/person-domain/account/model/HeaderUser";

export interface AccountMenuProps {
    readonly user: HeaderUser;
    readonly adminHref?: string;
    readonly profileHref: string;
    readonly publicUrl?: string;
    readonly sidebar?: boolean;
}
