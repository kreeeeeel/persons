import type { Challenge } from '@persons/id-client';

export type ActionResult<T = undefined> =
    { readonly ok: true; readonly data: T } | { readonly ok: false; readonly code: string };

export type BrowserChallenge = Omit<Challenge, 'expiresAt' | 'resendAt'> & {
    readonly expiresAt: string;
    readonly resendAt: string;
};
