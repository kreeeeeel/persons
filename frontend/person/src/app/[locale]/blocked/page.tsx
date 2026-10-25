import { redirect } from 'next/navigation';
import { BlockedAccount } from '@persons/person-domain/BlockedAccount';
import { accountAccess } from '@/modules/account/server/access';
import { signOut } from '@/modules/account/actions/signOut';
import { getServerConfig } from '@/shared/config/server';

export default async function BlockedPage() {
    const state = await accountAccess();
    if (!state.restriction?.scopes.includes('ACCOUNT')) {
        redirect('/');
    }
    return <BlockedAccount restriction={state.restriction} signOut={signOut} homeUrl={getServerConfig().publicUrl} />;
}
