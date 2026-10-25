export interface HeaderUser {
    readonly role?: "USER" | "ADMIN";
    readonly email?: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly patronymic?: string;
    readonly hasAvatar: boolean;
}
