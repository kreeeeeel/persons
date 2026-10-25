export type AccountActionResult<T = undefined> =
    { readonly ok: true; readonly data: T } | { readonly ok: false; readonly code: string };
