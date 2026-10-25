import { AdminOnly } from '@/modules/person/server/AdminOnly';
import { AchievementsScreen } from '@/modules/achievements/screens/AchievementsScreen/AchievementsScreen';

export default async function Page({ params }: { readonly params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <AdminOnly locale={locale}>
            <AchievementsScreen />
        </AdminOnly>
    );
}
