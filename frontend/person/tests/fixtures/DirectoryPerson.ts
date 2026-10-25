export interface DirectoryPerson {
    readonly tag: string;
    readonly name: { readonly ru: string; readonly en: string };
    readonly interests: readonly string[];
    readonly views: number;
    readonly reactions: number;
    readonly photos: number;
    readonly moments: number;
    readonly rating?: number;
    readonly joined: string;
}
