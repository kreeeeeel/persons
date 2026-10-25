'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Disclosure, Flex, Icon, Link, Text } from '@gravity-ui/uikit';
import { ArrowLeft, ArrowUpRight, ChevronDown } from '@gravity-ui/icons';
import { LanguagePicker, useLocale, useTranslate } from '@persons/i18n';
import { AppLink } from '@persons/ui/AppLink';
import { useSiteSettings } from '@persons/person-domain/settings/useSiteSettings';
import type { SiteSettings } from '@persons/person-client';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { openCookiePreferences } from '@/shared/privacy/cookiePreferences';
import styles from '@/modules/legal/screens/LegalScreen/LegalScreen.module.css';

interface DocumentSection {
    readonly id: string;
    readonly title: string;
    readonly paragraphs: Readonly<Record<string, string>>;
}

export function LegalScreen({
    kind,
    settings,
}: {
    readonly kind: 'privacy' | 'terms';
    readonly settings?: SiteSettings;
}) {
    const locale = useLocale();
    const t = useTranslate('legal');
    const sections = Object.values(t.raw(`${kind}.sections`) as Readonly<Record<string, DocumentSection>>);
    const [active, setActive] = useState('');
    const [tocExpanded, setTocExpanded] = useState(false);
    const compact = useMediaQuery('(max-width: 850px)');
    const { data, loading, error, refresh } = useSiteSettings(settings);
    const email = data?.supportEmail;
    const operator = data?.operatorNames?.[locale];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const section = entries.find((entry) => entry.isIntersecting);
                if (section) {
                    setActive(section.target.id);
                }
            },
            { rootMargin: '-15% 0px -65% 0px' },
        );
        document.querySelectorAll('[data-legal-section]').forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [kind, locale]);

    return (
        <Box>
            <AppLink href={`/${locale}`} className={styles.back} view="secondary">
                <Icon data={ArrowLeft} size={18} />
                {t('home')}
            </AppLink>
            <Flex direction="column" gap="4" className={styles.heading}>
                <Text className={styles.eyebrow}>{t('eyebrow')}</Text>
                <Text as="h1" className={styles.title}>
                    {t(`${kind}.title`)}
                </Text>
                <Text as="p" className={styles.intro}>
                    {t(`${kind}.intro`)}
                </Text>
                <Flex alignItems="center" gap="3" wrap>
                    <Text color="secondary">{t('version')}</Text>
                    <LanguagePicker />
                </Flex>
            </Flex>
            <Box className={styles.layout}>
                <Box as="aside" className={styles.sidebar}>
                    <Disclosure expanded={!compact || tocExpanded} onUpdate={setTocExpanded}>
                        <Disclosure.Summary>
                            {({ onClick, id, expanded, ariaControls }) => (
                                <Button
                                    id={id}
                                    onClick={onClick}
                                    aria-expanded={expanded}
                                    aria-controls={ariaControls}
                                    view="flat"
                                    size="xl"
                                    width="max"
                                    className={styles.tocToggle}
                                >
                                    {t('navigation')}
                                    <Icon data={ChevronDown} size={18} />
                                </Button>
                            )}
                        </Disclosure.Summary>
                        <Disclosure.Details className={styles.tocDetails}>
                            <Flex as="nav" direction="column" gap="1" aria-label={t('navigation')}>
                                <Flex className={styles.documents} gap="2" direction="column">
                                    <AppLink
                                        href={`/${locale}/privacy`}
                                        aria-current={kind === 'privacy' ? 'page' : undefined}
                                        className={styles.documentLink}
                                    >
                                        {t('privacyLink')}
                                    </AppLink>
                                    <AppLink
                                        href={`/${locale}/terms`}
                                        aria-current={kind === 'terms' ? 'page' : undefined}
                                        className={styles.documentLink}
                                    >
                                        {t('termsLink')}
                                    </AppLink>
                                </Flex>
                                {sections.map((section, index) => (
                                    <Link
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className={styles.tocLink}
                                        aria-current={active === section.id ? 'location' : undefined}
                                        onClick={() => setActive(section.id)}
                                    >
                                        <Text className={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                                        {section.title}
                                    </Link>
                                ))}
                                <Link
                                    href="#contacts"
                                    className={styles.tocLink}
                                    aria-current={active === 'contacts' ? 'location' : undefined}
                                >
                                    {t('contacts')}
                                    <Icon data={ArrowUpRight} size={16} />
                                </Link>
                            </Flex>
                        </Disclosure.Details>
                    </Disclosure>
                </Box>
                <Box as="article" className={styles.article}>
                    {sections.map((section, index) => (
                        <Box
                            as="section"
                            key={section.id}
                            id={section.id}
                            data-legal-section
                            className={styles.section}
                        >
                            <Text as="h2" className={styles.sectionTitle}>
                                <Text color="hint">
                                    {String(index + 1).padStart(2, '0')}
                                    {'. '}
                                </Text>
                                {section.title}
                            </Text>
                            {Object.values(section.paragraphs).map((paragraph) => (
                                <Text as="p" key={paragraph} className={styles.paragraph}>
                                    {paragraph}
                                </Text>
                            ))}
                            {section.id === 'cookies' && (
                                <Button size="l" view="outlined" onClick={openCookiePreferences}>
                                    {t('cookieSettings')}
                                </Button>
                            )}
                        </Box>
                    ))}
                    <Box
                        as="section"
                        id="contacts"
                        data-legal-section
                        className={`${styles.section} ${styles.contacts}`}
                    >
                        <Text as="h2" className={styles.sectionTitle}>
                            {t('contacts')}
                        </Text>
                        {loading && (
                            <Text as="p" role="status">
                                {t('contactsLoading')}
                            </Text>
                        )}
                        {error && (
                            <Flex direction="column" gap="3">
                                <Alert theme="warning" message={t('contactsUnavailable')} />
                                <Button size="l" onClick={refresh}>
                                    {t('retryContacts')}
                                </Button>
                            </Flex>
                        )}
                        <Text as="p" color="secondary">
                            {t('operator')}
                        </Text>
                        <Text as="p">{operator || (data ? t('missingOperator') : '')}</Text>
                        {email ? (
                            <Link className={styles.email} href={`mailto:${email}`}>
                                {email}
                                <Icon data={ArrowUpRight} size={20} />
                            </Link>
                        ) : data ? (
                            <Text as="p" color="secondary">
                                {t('missingEmail')}
                            </Text>
                        ) : null}
                        <Text as="p" className={styles.paragraph}>
                            {t('contactHint')}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
