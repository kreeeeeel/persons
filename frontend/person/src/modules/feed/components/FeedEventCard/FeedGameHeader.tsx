import { Box, Flex, Text } from '@gravity-ui/uikit';
import type { PersonSummary } from '@persons/person-client';
import { LoadedImage } from '@persons/ui';
import { AppLink } from '@persons/ui/AppLink';
import { useLocale, useTranslate } from '@persons/i18n';
import { ContentTime } from '@persons/person-domain/ContentTime';
import { PersonIdentity } from '@persons/person-domain/PersonIdentity';
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
        <Flex alignItems="center" gap="2" className={styles.gameHeader}>
            <Flex alignItems="center" gap="2" wrap className={styles.gameIdentity}>
                <AppLink href={href} className={styles.page} aria-label={page.fullName}>
                    <PersonIdentity person={page} density="compact" compactName />
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
                            width={12}
                            height={12}
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
