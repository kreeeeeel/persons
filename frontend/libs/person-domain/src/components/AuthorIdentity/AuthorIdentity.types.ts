import type { PublicAuthor } from "@persons/person-client";

export interface AuthorIdentityProps {
    readonly author: PublicAuthor;
    readonly description?: string;
    readonly publicUrl?: string;
    readonly centered?: boolean;
}
