'use client';

import { Button, DropdownMenu, Flex, Menu, Skeleton, Text } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n/provider';
import { useLanguageMenuItems } from '@persons/i18n/useLanguageMenuItems';
import { Flag } from '@persons/i18n/Flag/Flag';
import type { LanguagePickerProps } from '@persons/i18n/LanguagePicker/LanguagePicker.types';
import styles from '@persons/i18n/LanguagePicker/LanguagePicker.module.css';

export function LanguagePicker({ variant = 'dropdown' }: LanguagePickerProps) {
    const t = useTranslate('common');
    const { locale, choices, choose, pending, items } = useLanguageMenuItems();

    if (pending) {
        return <Skeleton className={styles.skeleton} aria-label={t('loading')} />;
    }

    if (variant === 'inline') {
        return (
            <Flex gap="1" className={styles.root}>
                {choices.map((choice) => (
                    <Button
                        key={choice.locale}
                        view={locale === choice.locale ? 'normal' : 'flat'}
                        onClick={() => choose(choice.locale)}
                    >
                        {choice.label}
                    </Button>
                ))}
            </Flex>
        );
    }

    if (variant === 'menu') {
        return (
            <Menu className={styles.root}>
                {choices.map((choice) => (
                    <Menu.Item key={choice.locale} onClick={() => choose(choice.locale)}>
                        <Flex alignItems="center" gap="2" className={styles.choice}>
                            <Flag country={choice.country} />
                            <Text as="span" variant="body-2">
                                {choice.label}
                            </Text>
                        </Flex>
                    </Menu.Item>
                ))}
            </Menu>
        );
    }

    return (
        <DropdownMenu
            items={items}
            popupProps={{ className: styles.popup }}
            renderSwitcher={(props) => (
                <Button
                    {...props}
                    view="flat"
                    size="l"
                    aria-label={t('language')}
                    className={`${styles.root} ${styles.switcher}`}
                >
                    <Flex alignItems="center" gap="2" className={styles.choice}>
                        <Flag country={locale === 'ru' ? 'ru' : 'gb'} />
                        <Text as="span" variant="body-2">
                            {variant === 'compact' ? locale.toUpperCase() : locale === 'ru' ? 'Русский' : 'English'}
                        </Text>
                    </Flex>
                </Button>
            )}
        />
    );
}
