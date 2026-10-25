export interface PersonFeedPage {
    readonly items: readonly { readonly id: string }[];
    readonly total: number;
    readonly page: number;
    readonly size: number;
}

export interface InfiniteFeedState<P extends PersonFeedPage> {
    readonly key: string;
    readonly resourceKey: string;
    readonly data?: P;
    readonly error?: string;
    readonly complete?: boolean;
}
