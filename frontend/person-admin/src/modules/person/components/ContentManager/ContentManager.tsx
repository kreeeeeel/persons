'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flex, Link, Text } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { AppLink } from '@persons/ui/AppLink';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { FeedContent } from '@persons/person-domain/FeedContent';
import { RatingsPanel } from '@persons/person-domain/RatingsPanel';
import { CommentsFeed } from '@persons/person-domain/CommentsFeed';
import { CreditFeed } from '@persons/person-domain/CreditFeed';
import { MediaGrid } from '@persons/person-domain/MediaGrid';
import { AchievementsFeed } from '@persons/person-domain/AchievementsFeed';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import { PersonAdminTools } from '@persons/person-domain/PersonAdminTools';
import { useUploadEvents } from '@persons/person-domain/uploads/useUploadEvents';

const TABS = ['wall', 'ratings', 'photos', 'moments', 'credit', 'achievements'] as const;

export function ContentManager({ tag, publicUrl }: { readonly tag: string; readonly publicUrl: string }) {
    const t = useTranslate('person');
    const locale = useLocale();
    const router = useRouter();
    const [tab, setTab] = useState('wall');
    const [notice, setNotice] = useState(false);
    const [adminRevision, setAdminRevision] = useState(0);
    const load = useCallback((signal: AbortSignal) => personClient.persons.getPerson({ tag }, { signal }), [tag]);
    const resource = usePersonData(`admin-person:${tag}`, load);
    const profile = resource.data;
    useUploadEvents(profile?.id, () => resource.refresh());
    return (
        <FeedContent
            loading={resource.loading}
            error={resource.error}
            retainContentOnError={profile !== undefined}
            empty={false}
            emptyTitle=""
            emptyDescription=""
            onRetry={resource.refresh}
        >
            {profile && (
                <Flex direction="column" gap="5">
                    <AppLink href={`/${locale}/persons`}>{t('persons')}</AppLink>
                    <Flex alignItems="center" justifyContent="space-between" gap="3" wrap>
                        <Text as="h1" variant="display-1">
                            {profile.fullName}
                        </Text>
                        <Link
                            href={new URL(`/${profile.tag}`, publicUrl).href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            @{profile.tag}
                        </Link>
                    </Flex>
                    <MutationFeedback published={notice} />
                    <SegmentedTabs
                        label={profile.fullName}
                        value={tab}
                        onUpdate={setTab}
                        items={TABS.map((value) => ({ value, label: t(value) }))}
                    />
                    {tab === 'wall' && <CommentsFeed personId={profile.id} signedIn publicUrl={publicUrl} />}
                    {tab === 'ratings' && (
                        <RatingsPanel
                            personId={profile.id}
                            signedIn
                            initialOptions={profile.ratingOptions}
                            initialRating={profile.rating}
                            onChange={resource.refresh}
                            publicUrl={publicUrl}
                        />
                    )}
                    {tab === 'credit' && <CreditFeed personId={profile.id} signedIn publicUrl={publicUrl} />}
                    {tab === 'photos' && (
                        <MediaGrid
                            personId={profile.id}
                            personTag={profile.tag}
                            kind="PHOTO"
                            signedIn
                            publicUrl={publicUrl}
                        />
                    )}
                    {tab === 'moments' && (
                        <MediaGrid
                            personId={profile.id}
                            personTag={profile.tag}
                            kind="MOMENT"
                            signedIn
                            publicUrl={publicUrl}
                        />
                    )}
                    {tab === 'achievements' && (
                        <AchievementsFeed personId={profile.id} canManage revision={adminRevision} />
                    )}
                    <PersonAdminTools
                        profile={profile}
                        onSaved={(nextTag) => {
                            if (nextTag) {
                                router.replace(`/${locale}/persons/${nextTag}`);
                                return;
                            }
                            resource.refresh();
                            setAdminRevision((value) => value + 1);
                            setNotice(true);
                        }}
                    />
                </Flex>
            )}
        </FeedContent>
    );
}
