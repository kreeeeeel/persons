import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { VariablesScreen } from '@/modules/settings/screens/VariablesScreen/VariablesScreen';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <AdminOnly locale={locale}>
            <VariablesScreen />
        </AdminOnly>
    );
}
