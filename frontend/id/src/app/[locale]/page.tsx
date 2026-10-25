import { IdScreen } from '@/modules/id/screens/IdScreen/IdScreen';

const OAUTH_ERRORS = ['OAUTH_UNAVAILABLE', 'INVALID_OAUTH', 'OAUTH_ACCOUNT_CONFLICT', 'FORBIDDEN'];

export default async function Page({ searchParams }: { readonly searchParams: Promise<{ oauthError?: string }> }) {
    const { oauthError } = await searchParams;

    return <IdScreen initialError={oauthError && OAUTH_ERRORS.includes(oauthError) ? oauthError : undefined} />;
}
