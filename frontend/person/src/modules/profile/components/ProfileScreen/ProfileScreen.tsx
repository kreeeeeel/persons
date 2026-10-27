'use client';

import { SocialLinks } from '@/modules/profile/components/SocialLinks/SocialLinks';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDynProperty } from '@persons/dynamic-properties';
import { gamesEnabled } from '@/shared/dynamicProperties/definitions';
import { Box, Button, Flex, Icon, Text } from '@gravity-ui/uikit';
import { PersonPencil } from '@gravity-ui/icons';
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
import { CreditPanel } from '@/modules/profile/components/CreditPanel/CreditPanel';
import { IntegrationsPanel } from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel';
import { MutationFeedback } from '@/modules/profile/components/MutationFeedback/MutationFeedback';
import { MilitaryServiceDate } from '@/modules/profile/components/MilitaryServiceDate';
import { MilitaryServiceCountdown } from '@/modules/profile/components/MilitaryServiceCountdown';
import { ProfileBirthDate } from '@/modules/profile/components/ProfileBirthDate';
import { ProfileMetrics } from '@/modules/profile/components/ProfileMetrics';
import { ProfileDescription } from '@/modules/profile/components/ProfileDescription/ProfileDescription';
import { Gallery } from '@persons/person-domain/Gallery';
import { AuthorIdentity } from '@persons/person-domain/AuthorIdentity';
import { TagLabel } from '@persons/person-domain/TagLabel';
import { ProfileRestriction } from '@/modules/profile/components/ProfileRestriction/ProfileRestriction';
import { ProfilePresence } from '@/modules/profile/components/ProfilePresence/ProfilePresence';
import { militaryServiceToday } from '@/modules/profile/model/serviceCalendar';
import type { ProfileScreenProps } from '@/modules/profile/components/ProfileScreen/ProfileScreen.types';
import styles from '@/modules/profile/components/ProfileScreen/ProfileScreen.module.css';

const AGGREGATE_POLL_DELAY = 2000;
const AGGREGATE_RETRY_DELAY = 5000;

const TABS = ['wall', 'ratings', 'media', 'credit', 'achievements'] as const;

export function ProfileScreen({
    profile: initialProfile,
    signedIn,
    account,
    administrator,
    integrationsPreview = false,
    today: providedToday,
}: ProfileScreenProps) {
    const t = useTranslate('person');
    const integrationText = useTranslate('integrations');
    const details = useTranslate('profileDetails');
    const [today] = useState(() => providedToday ?? militaryServiceToday(Date.now()));
    const router = useRouter();
    const [selectedTab, setTab] = useState(integrationsPreview ? 'integrations' : 'wall');
    const games = useDynProperty(gamesEnabled);
    const tabs = games ? [...TABS, 'integrations'] : TABS;
    const mediaLocation = useMediaLocation(initialProfile.tag);
    const contentLocation = useContentLocation(initialProfile.tag);
    const selected = selectedTab;
    const tab = contentLocation.content
        ? games
            ? 'integrations'
            : 'wall'
        : mediaLocation.media
          ? 'media'
          : selected === 'integrations' && !games
            ? 'wall'
            : selected;
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
    const fullName = profile.fullName;
    const description = profile.description;
    const birthDate = profile.dates?.birthDate?.toISOString().slice(0, 10);
    const departureDate = profile.dates?.militaryDepartureDate?.toISOString().slice(0, 10);
    const service = departureDate
        ? {
              departureDate,
              returnDate: profile.dates?.militaryReturnDate?.toISOString().slice(0, 10),
          }
        : undefined;
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
                <Box className={styles.columns}>
                    <Box className={styles.identity}>
                        <Flex
                            as="aside"
                            aria-label={details('sidebar')}
                            direction="column"
                            gap="2"
                            alignItems="center"
                            className={styles.avatarColumn}
                        >
                            <Box className={styles.avatar}>
                                <LoadedAvatar
                                    size={128}
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
                            <Text
                                as="h1"
                                className={`${styles.sidebarName} ${profile.restriction?.scopes.includes('ACCOUNT') ? styles.blockedName : ''}`}
                            >
                                {fullName}
                            </Text>
                            <ProfileMetrics stats={profile.stats} />
                            <Box className={styles.facts}>
                                {birthDate && <ProfileBirthDate birthDate={birthDate} today={today} />}
                                {service && <MilitaryServiceDate service={service} today={today} showDepartureDate />}
                            </Box>
                            {profile.linkedAccount && (
                                <Box className={styles.linkedAccount}>
                                    <AuthorIdentity author={profile.linkedAccount} description={t('linkedProfile')} />
                                </Box>
                            )}
                            {service && <MilitaryServiceCountdown service={service} today={today} />}
                            {profile.presence && <ProfilePresence presence={profile.presence} />}
                            {signedIn && profile.canClaim && (
                                <Button
                                    size="l"
                                    view="flat"
                                    className={styles.claim}
                                    disabled={profile.claimPending}
                                    onClick={() => setClaim(true)}
                                >
                                    <Icon data={PersonPencil} size={20} />
                                    {t(profile.claimPending ? 'claimPending' : 'claimPage')}
                                </Button>
                            )}
                        </Flex>
                        <Flex direction="column" gap="2" className={styles.biography}>
                            {profile.restriction && (
                                <ProfileRestriction restriction={profile.restriction} name={profile.fullName} />
                            )}
                            {!!profile.tags.length && (
                                <Flex gap="2" wrap justifyContent="flex-start">
                                    {profile.tags.map((tag) => (
                                        <TagLabel key={tag} tag={tag} />
                                    ))}
                                </Flex>
                            )}
                            <ProfileDescription description={description} />
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
                    <Flex direction="column" gap="6" className={styles.content}>
                        <MutationFeedback notice={notice} published={published} error={resource.error} />
                        <Box className={styles.tabs}>
                            <SegmentedTabs
                                label={profile.fullName}
                                value={tab}
                                onUpdate={setTab}
                                items={tabs.map((value) => ({
                                    value,
                                    label:
                                        (value === 'integrations'
                                            ? integrationText('title')
                                            : value === 'media'
                                              ? details('media')
                                              : t(value)) +
                                        (value === 'media' ? ` · ${profile.stats.photos + profile.stats.moments}` : ''),
                                }))}
                            />
                        </Box>
                        <Box
                            role="tabpanel"
                            aria-label={
                                tab === 'integrations'
                                    ? integrationText('title')
                                    : tab === 'media'
                                      ? details('media')
                                      : t(tab)
                            }
                            className={styles.panel}
                        >
                            {tab === 'integrations' && games && (
                                <IntegrationsPanel personId={profile.id} personTag={profile.tag} />
                            )}
                            {tab === 'wall' && <CommentsPanel personId={profile.id} signedIn={signedIn} />}
                            {tab === 'media' && (
                                <Gallery
                                    personId={profile.id}
                                    personTag={profile.tag}
                                    signedIn={signedIn}
                                    selectedMedia={mediaLocation.media}
                                    onOpenMedia={(kind, id) => {
                                        setTab('media');
                                        mediaLocation.open(kind, id);
                                    }}
                                    onCloseMedia={() => {
                                        setTab('media');
                                        mediaLocation.close();
                                    }}
                                />
                            )}
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
                            {tab === 'credit' && <CreditPanel personId={profile.id} signedIn={signedIn} />}
                            {tab === 'achievements' && (
                                <AchievementsFeed
                                    personId={profile.id}
                                    revision={adminRevision}
                                    canManage={administrator}
                                />
                            )}
                        </Box>
                    </Flex>
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
            {editor && <ProfileEditor profile={profile} onClose={() => setEditor(false)} onSaved={saved} />}
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
