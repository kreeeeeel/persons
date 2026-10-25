export interface ContentBulkResult {
    readonly success: string[];
    readonly failures: { readonly key: string; readonly code: string }[];
}
