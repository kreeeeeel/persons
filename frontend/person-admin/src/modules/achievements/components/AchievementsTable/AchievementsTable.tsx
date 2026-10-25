'use client';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';
import { Flex, Label, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import type { Achievement } from '@persons/person-client';
import { useTranslate } from '@persons/i18n';
import styles from '@/modules/achievements/components/AchievementsTable/AchievementsTable.module.css';

export function AchievementsTable({
    items,
    pending,
    onEdit,
    onGrant,
    onArchive,
}: {
    readonly items: Achievement[];
    readonly pending: boolean;
    readonly onEdit: (item: Achievement) => void;
    readonly onGrant: (item: Achievement) => void;
    readonly onArchive: (item: Achievement) => void;
}) {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    return (
        <ActionTable
            data={items}
            label={(item) => item.title}
            disabled={pending}
            actions={(item) => [
                { text: t('edit'), action: () => onEdit(item) },
                {
                    text: t('grantAchievement'),
                    disabled: !item.active || item.type === 'AUTOMATIC',
                    action: () => onGrant(item),
                },
                {
                    text: t('archiveAchievement'),
                    theme: 'danger',
                    disabled: !item.active,
                    action: () => onArchive(item),
                },
            ]}
            columns={[
                {
                    id: 'title',
                    name: cms('name'),
                    className: styles.title,
                    template: (item) => (
                        <Flex alignItems="center" gap="3">
                            <LoadedImage
                                src={`/api/person/v1/achievements/${item.id}/image?v=${item.version}`}
                                alt=""
                                width={64}
                                height={64}
                                objectFit="contain"
                            />
                            <Flex direction="column" gap="2">
                                <Text variant="subheader-1">{item.title}</Text>
                                {!item.active && <Label theme="normal">{t('archivedAchievement')}</Label>}
                            </Flex>
                        </Flex>
                    ),
                },
                {
                    id: 'description',
                    name: cms('description'),
                    className: styles.description,
                    template: (item) => (
                        <Text color="secondary" className={styles.clamp} title={item.description}>
                            {item.description || '—'}
                        </Text>
                    ),
                },
                {
                    id: 'type',
                    name: cms('type'),
                    template: (item) => (
                        <Label theme={item.type === 'AUTOMATIC' ? 'info' : 'normal'}>
                            {t(item.type === 'AUTOMATIC' ? 'achievementAutomatic' : 'achievementManual')}
                        </Label>
                    ),
                },
                {
                    id: 'automatic',
                    name: cms('automatic'),
                    template: (item) => (
                        <Text color="secondary">
                            {item.type === 'AUTOMATIC'
                                ? t('achievementAgeRule', { years: item.pageAgeYears ?? 1 })
                                : cms('no')}
                        </Text>
                    ),
                },
            ]}
        />
    );
}
