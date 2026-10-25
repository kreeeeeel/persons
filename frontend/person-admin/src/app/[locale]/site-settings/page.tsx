import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { SiteSettingsScreen } from '@/modules/settings/screens/SiteSettingsScreen/SiteSettingsScreen';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return (
        <AdminOnly locale={locale}>
            <SiteSettingsScreen />
        </AdminOnly>
    );
}
