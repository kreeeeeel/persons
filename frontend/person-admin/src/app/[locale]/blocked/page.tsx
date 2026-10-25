import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { BlockedScreen } from '@/modules/blocked/components/BlockedScreen/BlockedScreen';
import { getServerConfig } from '@/shared/config/server';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <AdminOnly locale={locale}>
            <BlockedScreen publicUrl={getServerConfig().personPublicUrl} />
        </AdminOnly>
    );
}
