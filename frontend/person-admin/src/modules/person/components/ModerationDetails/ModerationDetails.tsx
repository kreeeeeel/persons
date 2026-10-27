'use client';
import { reviewChanges, reviewFieldLabels } from '@/modules/moderation/model/reviewChanges';
import { CreditKind, MediaKind } from '@persons/person-client';
import type { ModerationItem } from '@persons/person-client';
import { moderationMedia, readModerationPayload } from '@/modules/moderation/model/content';
import { MediaVideoPlayer } from '@persons/person-domain/media/MediaVideoPlayer';

import { Alert, Box, Flex, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { EmptyState } from '@persons/person-domain/EmptyState';
import { useTranslate } from '@persons/i18n';
import { mediaHref } from '@persons/person-domain/api/browser';
import styles from '@/modules/person/components/ModerationDetails/ModerationDetails.module.css';

const TRANSLATED_KINDS = new Set<string>([...Object.values(CreditKind), ...Object.values(MediaKind)]);

function valueText(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (Array.isArray(value)) {
        return value.map(valueText).join('\n') || '—';
    }
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>)
            .map(valueText)
            .join(' · ');
    }

    return String(value);
}

export function ModerationDetails({ payload, item }: { readonly payload: string; readonly item?: ModerationItem }) {
    const t = useTranslate('person');
    const moderation = useTranslate('moderation');
    const cms = useTranslate('cms');
    const fields = readModerationPayload(payload);
    if (!fields) {
        return <Alert theme="danger" align="center" message={moderation('invalidPayload')} />;
    }
    const previous = item?.previousPayload ? readModerationPayload(item.previousPayload) : undefined;
    const editing = item?.kind.startsWith('UPDATE_') || item?.kind === 'LINK_ACCOUNT';
    const changes = reviewChanges(fields, previous);
    function label(key: string) {
        return key === 'ratingOptions' || key === 'searchKeywords'
            ? cms(key)
            : key === 'tags'
              ? cms('profileTags')
              : t(reviewFieldLabels[key]);
    }
    function display(key: string, value: unknown) {
        if (key === 'presenceStatus' && (value === 'MISSING' || value === 'UNRESPONSIVE')) {
            return t(value === 'MISSING' ? 'presenceMissing' : 'presenceUnresponsive');
        }
        return key === 'kind' && typeof value === 'string' && TRANSLATED_KINDS.has(value) ? t(value) : valueText(value);
    }
    const media = item
        ? moderationMedia(item)
        : {
              id: typeof fields.mediaId === 'string' ? fields.mediaId : undefined,
              kind: fields.kind,
          };
    const mediaId = media.id;

    return (
        <Flex direction="column" gap="4" className={styles.details}>
            {editing && !previous && <Alert theme="info" align="center" message={cms('originalUnavailable')} />}
            {previous && changes.length === 0 && (
                <EmptyState illustration="moderation" description={cms('noChanges')} compact />
            )}
            {changes.map(({ key, before, after }) => (
                <Flex key={key} direction="column" gap="2">
                    <Text variant="subheader-1">{label(key)}</Text>
                    {previous ? (
                        <Box className={styles.comparison}>
                            <Flex direction="column" gap="2" className={styles.before}>
                                <Text color="secondary">{cms('before')}</Text>
                                <Text className={styles.value}>{display(key, before)}</Text>
                            </Flex>
                            <Flex direction="column" gap="2" className={styles.after}>
                                <Text color="secondary">{cms('after')}</Text>
                                <Text className={styles.value}>{display(key, after)}</Text>
                            </Flex>
                        </Box>
                    ) : (
                        <Text className={styles.value}>{display(key, after)}</Text>
                    )}
                </Flex>
            ))}
            {mediaId && media.kind === 'MOMENT' && (
                <MediaVideoPlayer id={mediaId} title={valueText(fields.caption ?? '')} />
            )}
            {mediaId && media.kind !== 'MOMENT' && (
                <Box className={styles.image}>
                    <LoadedImage
                        responsive
                        width={1000}
                        height={750}
                        src={mediaHref(mediaId)}
                        alt={valueText(fields.caption ?? '')}
                    />
                </Box>
            )}
        </Flex>
    );
}
