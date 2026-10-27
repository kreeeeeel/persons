import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { TagDictionaryScreen } from '@/modules/settings/screens/TagDictionaryScreen/TagDictionaryScreen';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <AdminOnly locale={locale}>
            <TagDictionaryScreen />
        </AdminOnly>
    );
}
