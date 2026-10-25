'use client';

import { SocialLinks } from '@/modules/profile/components/SocialLinks/SocialLinks';
import { ProfileStats } from '@/modules/profile/components/ProfileStats/ProfileStats';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDynProperty } from '@persons/dynamic-properties';
import { gamesEnabled } from '@/shared/dynamicProperties/definitions';
import { Box, Button, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { Person } from '@gravity-ui/icons';
import { VerifiedMark } from '@persons/ui/VerifiedMark';
import { LoadedAvatar } from '@persons/ui';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { useTranslate } from '@persons/i18n';
import type { ModerationReceipt } from '@persons/person-client';
import { personClient, mediaHref } from '@persons/person-domain/api/browser';
import { usePersonData } from '@persons/person-domain/hooks/usePersonData';
import { useMediaLocation } from '@persons/person-domain/hooks/useMediaLocation';
import { useContentLocation } from '@persons/person-domain/hooks/useContentLocation';
import { ProfileEditor } from '@persons/person-domain/ProfileEditor';
import { PersonAdminTools } from '@persons/person-domain/PersonAdminTools';
import { useUploadEvents } from '@persons/person-domain/uploads/useUploadEvents';
import { MediaUploader } from '@persons/person-domain/MediaUploader';
import { OwnershipDialog } from '@persons/person-domain/OwnershipDialog';
import { AchievementsFeed } from '@persons/person-domain/AchievementsFeed';
import { SiteHeader } from '@/shared/ui/SiteHeader/SiteHeader';
import { ScrollToTop } from '@/shared/ui/ScrollToTop/ScrollToTop';
import { CommentsPanel } from '@/modules/profile/components/CommentsPanel/CommentsPanel';
import { RatingsPanel } from '@/modules/profile/components/RatingsPanel/RatingsPanel';
import { MomentsPanel } from '@/modules/profile/components/MomentsPanel/MomentsPanel';
import { PhotosPanel } from '@/modules/profile/components/PhotosPanel/PhotosPanel';
import { CreditPanel } from '@/modules/profile/components/CreditPanel/CreditPanel';
import { IntegrationsPanel } from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel';
import { MutationFeedback } from '@/modules/profile/components/MutationFeedback/MutationFeedback';
import type { ProfileScreenProps } from '@/modules/profile/components/ProfileScreen/ProfileScreen.types';
import styles from '@/modules/profile/components/ProfileScreen/ProfileScreen.module.css';

const AGGREGATE_POLL_DELAY = 2000;
const AGGREGATE_RETRY_DELAY = 5000;

const TABS = ['wall', 'ratings', 'moments', 'photos', 'credit', 'achievements'] as const;

export function ProfileScreen({
    profile: initialProfile,
    signedIn,
    account,
    administrator,
    integrationsPreview = false,
}: ProfileScreenProps) {
    const t = useTranslate('person');
    const integrationText = useTranslate('integrations');
    const router = useRouter();
    const [selectedTab, setTab] = useState(integrationsPreview ? 'integrations' : 'wall');
    const games = useDynProperty(gamesEnabled);
    const tabs = games ? [...TABS, 'integrations'] : TABS;
    const mediaLocation = useMediaLocation(initialProfile.tag);
    const contentLocation = useContentLocation(initialProfile.tag);
    const tab = contentLocation.content
        ? games
            ? 'integrations'
            : 'wall'
        : mediaLocation.media
          ? mediaLocation.media.kind === 'PHOTO'
              ? 'photos'
              : 'moments'
          : selectedTab === 'integrations' && !games
            ? 'wall'
            : selectedTab;
    const [editor, setEditor] = useState(false);
    const [avatar, setAvatar] = useState(false);
    const [notice, setNotice] = useState(false);
    const [published, setPublished] = useState(false);
    const [claim, setClaim] = useState(false);
    const [adminRevision, setAdminRevision] = useState(0);
    const load = useCallback(
        (signal: AbortSignal) => personClient.persons.getPerson({ tag: initialProfile.tag }, { signal }),
        [initialProfile.tag],
    );
    const resource = usePersonData(`profile:${initialProfile.id}:${initialProfile.version}`, load, initialProfile);
    const profile = resource.data ?? initialProfile;
    useUploadEvents(profile.id, () => resource.refresh());

    useEffect(() => {
        const controller = new AbortController();
        personClient.persons
            .recordView(
                { id: profile.id, viewInput: { visitorId: crypto.randomUUID() } },
                { signal: controller.signal },
            )
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    console.error('Unable to record profile view', error instanceof Error ? error.name : 'Error');
                }
            });

        return () => controller.abort();
    }, [profile.id]);

    useEffect(() => {
        if (!profile.stats.calculationPending || resource.refreshing) {
            return;
        }
        const timer = setTimeout(resource.refresh, resource.error ? AGGREGATE_RETRY_DELAY : AGGREGATE_POLL_DELAY);
        return () => clearTimeout(timer);
    }, [profile.stats, resource.error, resource.refresh, resource.refreshing]);

    function saved(receipt: ModerationReceipt, tag?: string) {
        setEditor(false);
        setAvatar(false);
        if (receipt.status === 'APPROVED' && tag && tag !== profile.tag) {
            router.replace(`/${tag}`);
            return;
        }
        setNotice(receipt.status === 'PENDING');
        setPublished(receipt.status === 'APPROVED');
        resource.refresh();
    }

    return (
        <Box className={styles.page}>
            <SiteHeader>{account}</SiteHeader>
            <Flex as="main" direction="column" gap="6" className={styles.main}>
                <Box className={styles.identity}>
                    <Flex direction="column" gap="3" alignItems="center" className={styles.avatarColumn}>
                        <Box className={styles.avatar}>
                            <LoadedAvatar
                                size={184}
                                name={profile.fullName}
                                src={profile.avatarMediaId ? mediaHref(profile.avatarMediaId) : undefined}
                            />
                            {profile.verified && (
                                <Box
                                    as="button"
                                    type="button"
                                    aria-label={t('verifiedProfile')}
                                    className={styles.verified}
                                >
                                    <VerifiedMark />
                                    <Text className={styles.verifiedText}>{t('verifiedShort')}</Text>
                                </Box>
                            )}
                        </Box>
                        {signedIn && profile.canClaim && (
                            <Button
                                size="l"
                                view="action"
                                className={styles.claim}
                                disabled={profile.claimPending}
                                onClick={() => setClaim(true)}
                            >
                                <Icon data={Person} size={20} />
                                {t(profile.claimPending ? 'claimPending' : 'claimPage')}
                            </Button>
                        )}
                    </Flex>
                    <Flex direction="column" gap="2" className={styles.biography}>
                        <Box>
                            <Text as="h1" className={styles.name}>
                                {profile.fullName}
                            </Text>
                        </Box>
                        {!!profile.tags.length && (
                            <Flex gap="2" wrap justifyContent="flex-start">
                                {profile.tags.map((tag) => (
                                    <Label key={tag} size="m" theme="info">
                                        {tag}
                                    </Label>
                                ))}
                            </Flex>
                        )}
                        <Text
                            as="p"
                            className={styles.description}
                            color={profile.description ? 'primary' : 'secondary'}
                        >
                            {profile.description || t('noDescription')}
                        </Text>
                        <SocialLinks links={profile.socialLinks} />
                        {profile.canEdit && !administrator && (
                            <Flex gap="3" wrap justifyContent="flex-start">
                                <Button size="xl" onClick={() => setEditor(true)}>
                                    {t('edit')}
                                </Button>
                                <Button size="xl" onClick={() => setAvatar(true)}>
                                    {t('changeAvatar')}
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                </Box>
                <MutationFeedback notice={notice} published={published} error={resource.error} />
                <ProfileStats stats={profile.stats} />
                <Box className={styles.tabs}>
                    <SegmentedTabs
                        label={profile.fullName}
                        value={tab}
                        onUpdate={setTab}
                        items={tabs.map((value) => ({
                            value,
                            label:
                                (value === 'integrations' ? integrationText('title') : t(value)) +
                                (value === 'moments'
                                    ? ` · ${profile.stats.moments}`
                                    : value === 'photos'
                                      ? ` · ${profile.stats.photos}`
                                      : ''),
                        }))}
                    />
                </Box>
                <Box
                    role="tabpanel"
                    aria-label={tab === 'integrations' ? integrationText('title') : t(tab)}
                    className={styles.panel}
                >
                    {tab === 'integrations' && games && (
                        <IntegrationsPanel personId={profile.id} personTag={profile.tag} />
                    )}
                    {tab === 'wall' && <CommentsPanel personId={profile.id} signedIn={signedIn} />}
                    {tab === 'ratings' && (
                        <RatingsPanel
                            key={profile.id}
                            personId={profile.id}
                            signedIn={signedIn}
                            initialOptions={profile.ratingOptions}
                            initialRating={profile.rating}
                            onChange={resource.refresh}
                        />
                    )}
                    {tab === 'moments' && (
                        <MomentsPanel
                            personId={profile.id}
                            personTag={profile.tag}
                            signedIn={signedIn}
                            selectedMediaId={mediaLocation.media?.id}
                            onOpenMedia={(id) => {
                                setTab('moments');
                                mediaLocation.open('MOMENT', id);
                            }}
                            onCloseMedia={() => {
                                setTab('moments');
                                mediaLocation.close();
                            }}
                        />
                    )}
                    {tab === 'photos' && (
                        <PhotosPanel
                            personId={profile.id}
                            personTag={profile.tag}
                            signedIn={signedIn}
                            selectedMediaId={mediaLocation.media?.id}
                            onOpenMedia={(id) => {
                                setTab('photos');
                                mediaLocation.open('PHOTO', id);
                            }}
                            onCloseMedia={() => {
                                setTab('photos');
                                mediaLocation.close();
                            }}
                        />
                    )}
                    {tab === 'credit' && <CreditPanel personId={profile.id} signedIn={signedIn} />}
                    {tab === 'achievements' && (
                        <AchievementsFeed personId={profile.id} revision={adminRevision} canManage={administrator} />
                    )}
                </Box>
            </Flex>
            {administrator && (
                <PersonAdminTools
                    profile={profile}
                    onSaved={(tag) => {
                        if (tag) {
                            router.replace(`/${tag}`);
                            return;
                        }
                        resource.refresh();
                        setAdminRevision((value) => value + 1);
                    }}
                />
            )}
            {editor && (
                <ProfileEditor
                    key={profile.version}
                    profile={profile}
                    onClose={() => setEditor(false)}
                    onSaved={saved}
                />
            )}
            {avatar && (
                <MediaUploader personId={profile.id} kind="AVATAR" onClose={() => setAvatar(false)} onSaved={saved} />
            )}
            {signedIn && claim && (
                <OwnershipDialog
                    personId={profile.id}
                    onClose={() => setClaim(false)}
                    onSaved={() => {
                        setClaim(false);
                        setNotice(true);
                        router.refresh();
                    }}
                />
            )}
            <ScrollToTop />
        </Box>
    );
}
