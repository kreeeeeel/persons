import { Box, Flex, Text } from '@gravity-ui/uikit';
import type { PersonSummary } from '@persons/person-client';
import { LoadedAvatar, LoadedImage } from '@persons/ui';
import { AppLink } from '@persons/ui/AppLink';
import { useLocale, useTranslate } from '@persons/i18n';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { compactPersonName } from '@persons/person-domain/format/compactPersonName';
import { mediaHref } from '@persons/person-domain/api/browser';
import styles from '@/modules/feed/components/FeedEventCard/FeedEventCard.module.css';

export function FeedGameHeader({
    page,
    playedAt,
    game = 'dota2',
}: {
    readonly page: PersonSummary;
    readonly playedAt: Date;
    readonly game?: 'dota2' | 'cs2';
}) {
    const locale = useLocale();
    const t = useTranslate('feed');
    const href = `/${locale}/person/${page.tag}`;

    return (
        <Flex alignItems="center" gap="3" className={styles.gameHeader}>
            <AppLink href={href} aria-label={page.fullName}>
                <LoadedAvatar
                    size={44}
                    name={page.fullName}
                    src={page.avatarMediaId ? mediaHref(page.avatarMediaId) : undefined}
                />
            </AppLink>
            <Flex alignItems="baseline" gap="2" wrap className={styles.gameIdentity}>
                <AppLink href={href} className={styles.page} title={page.fullName}>
                    {compactPersonName(page.fullName, 'family-first')}
                </AppLink>
                <Text color="secondary" className={styles.gameAction}>
                    {t('eventGame')}
                    <Flex as="span" inline alignItems="center" gap="1">
                        <LoadedImage
                            src={
                                game === 'cs2'
                                    ? '/assets/integrations/leetify/cs2-logo.svg'
                                    : '/assets/integrations/dotabuff/dota-logo.svg'
                            }
                            alt=""
                            width={18}
                            height={18}
                        />
                        {t(game)}
                    </Flex>
                    <Box as="span" aria-hidden>
                        ·
                    </Box>
                    <ContentTime date={playedAt} className={styles.gameTime} />
                </Text>
            </Flex>
        </Flex>
    );
}
