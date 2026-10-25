import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { PersonManager } from '@/modules/person/components/PersonManager/PersonManager';
import { getServerConfig } from '@/shared/config/server';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return (
        <AdminOnly locale={locale}>
            <PersonManager publicUrl={getServerConfig().personPublicUrl} />
        </AdminOnly>
    );
}
