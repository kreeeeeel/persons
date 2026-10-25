export interface BlockedRow {
    readonly id: string;
    readonly userId: string;
    readonly userName?: string;
    readonly userTag?: string;
    readonly userAvatarUrl?: string;
    readonly personId?: string;
    readonly personName?: string;
    readonly personTag?: string;
    readonly personAvatarMediaId?: string;
    readonly scopes: Iterable<string>;
    readonly reason: string;
    readonly expiresAt?: Date;
}
