import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { ContentScreen } from '@/modules/content/components/ContentScreen/ContentScreen';
import { getServerConfig } from '@/shared/config/server';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <AdminOnly locale={locale}>
            <ContentScreen publicUrl={getServerConfig().personPublicUrl} />
        </AdminOnly>
    );
}
