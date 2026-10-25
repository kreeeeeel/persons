import type { Challenge } from '@persons/id-client';

export type EmailChallenge = Omit<Challenge, 'expiresAt' | 'resendAt'> & {
    readonly expiresAt: string;
    readonly resendAt: string;
};
