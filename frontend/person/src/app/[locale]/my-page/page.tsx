import { redirect } from 'next/navigation';
import { MyPageScreen } from '@/modules/account/components/MyPageScreen/MyPageScreen';
import { HeaderAccount } from '@/modules/account/components/HeaderAccount/HeaderAccount';
import { currentUser } from '@/modules/account/server/currentUser';
import { personApi } from '@/shared/api/person';
import { getServerConfig } from '@/shared/config/server';

export default async function MyPage({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!(await currentUser())) {
        const target = new URL(`/${locale}`, getServerConfig().idPublicUrl);
        target.searchParams.set('returnTo', `/person/${locale}/my-page`);
        redirect(target.href);
    }
    const state = await (await personApi()).persons.getMyPerson();
    if (state.person) {
        redirect(`/${state.person.tag}`);
    }
    return <MyPageScreen pending={state.pendingCreation} account={<HeaderAccount locale={locale} />} />;
}
