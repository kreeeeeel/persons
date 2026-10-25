'use client';

import { useCallback, useState } from 'react';
import { Alert, Button, Flex } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import { type Achievement } from '@persons/person-client';
import { personClient } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { AchievementEditor } from '@/modules/achievements/components/AchievementEditor/AchievementEditor';
import { GrantDialog } from '@/modules/achievements/components/GrantDialog/GrantDialog';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { AchievementsTable } from '@/modules/achievements/components/AchievementsTable/AchievementsTable';

const PAGE_SIZE = 12;

export function AchievementsScreen() {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState<{ achievement?: Achievement }>();
    const [grant, setGrant] = useState<Achievement>();
    const [saved, setSaved] = useState(false);
    const [granted, setGranted] = useState<number>();
    const mutation = usePersonMutation();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.achievements.listAchievements({ page, size: PAGE_SIZE, q: search || undefined }, { signal }),
        [search],
    );
    const resource = useInfinitePersonData(`admin-achievements:${search}`, load);
    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('achievements')}
                description={cms('achievementsDescription')}
                action={
                    <Button size="l" view="action" onClick={() => setEditor({})}>
                        {t('createAchievement')}
                    </Button>
                }
            />
            <ListFilterBar search={search} onSearch={setSearch} placeholder={cms('searchAchievements')} />
            <MutationFeedback {...mutation} />
            {saved && <Alert theme="success" message={t('achievementSaved')} onClose={() => setSaved(false)} />}
            {granted !== undefined && (
                <Alert
                    theme="success"
                    message={t('achievementGranted', { count: granted })}
                    onClose={() => setGranted(undefined)}
                />
            )}
            <ListTable
                title={t('achievements')}
                loading={resource.loading}
                error={resource.error}
                retry={resource.refresh}
                empty={!resource.data?.items.length}
                emptyTitle={t('emptyAchievements')}
                emptyDescription={t('emptyAchievementsDescription')}
                illustration="achievements"
            >
                <AchievementsTable
                    items={resource.data?.items ?? []}
                    pending={mutation.pending}
                    onEdit={(achievement) => setEditor({ achievement })}
                    onGrant={setGrant}
                    onArchive={(item) =>
                        mutation.run(
                            () => personClient.achievements.deleteAchievement({ id: item.id }),
                            resource.refresh,
                            false,
                        )
                    }
                />
            </ListTable>
            <InfiniteFeedLoader {...resource} />
            {editor && (
                <AchievementEditor
                    achievement={editor.achievement}
                    onClose={() => setEditor(undefined)}
                    onSaved={() => {
                        setEditor(undefined);
                        setSaved(true);
                        resource.refresh();
                    }}
                />
            )}
            {grant && (
                <GrantDialog
                    achievement={grant}
                    onClose={() => setGrant(undefined)}
                    onGranted={(count) => {
                        setGrant(undefined);
                        setGranted(count);
                    }}
                />
            )}
        </Flex>
    );
}
