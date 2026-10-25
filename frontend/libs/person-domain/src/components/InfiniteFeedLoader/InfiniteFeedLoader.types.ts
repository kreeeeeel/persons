export interface InfiniteFeedLoaderProps {
    readonly hasMore: boolean;
    readonly loadingMore: boolean;
    readonly moreError?: string;
    readonly loadMore: () => void;
    readonly active?: boolean;
}
