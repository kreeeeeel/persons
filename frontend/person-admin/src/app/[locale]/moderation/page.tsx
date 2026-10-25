import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { ModerationScreen } from '@/modules/person/components/ModerationScreen/ModerationScreen';
import { getServerConfig } from '@/shared/config/server';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return (
        <AdminOnly locale={locale}>
            <ModerationScreen publicUrl={getServerConfig().personPublicUrl} />
        </AdminOnly>
    );
}
