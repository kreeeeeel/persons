import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { ContentManager } from '@/modules/person/components/ContentManager/ContentManager';
import { getServerConfig } from '@/shared/config/server';

export default async function Page({ params }: { readonly params: Promise<{ locale: string; tag: string }> }) {
    const { locale, tag } = await params;
    return (
        <AdminOnly locale={locale}>
            <ContentManager tag={tag} publicUrl={getServerConfig().personPublicUrl} />
        </AdminOnly>
    );
}
