"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Flex, RadioGroup, Switch, Text } from "@gravity-ui/uikit";
import { flagAsset, useLanguageMenuItems, useTranslate } from "@persons/i18n";
import { LoadedImage } from "@persons/ui";
import { useThemePreference } from "@persons/theme";
import type { ThemePreference } from "@persons/theme";
import { useMarqueePreference } from "@persons/ui/BottomMarquee/useMarqueePreference";
import styles from "@persons/person-domain/account/components/InterfaceSettings/InterfaceSettings.module.css";
import type { InterfaceSettingsProps } from "@persons/person-domain/account/components/InterfaceSettings/InterfaceSettings.types";

const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

export function InterfaceSettings({
    showMarqueeSetting = false,
}: InterfaceSettingsProps) {
    const t = useTranslate("account");
    const languages = useLanguageMenuItems();
    const { preference, setPreference } = useThemePreference();
    const { hidden, setHidden } = useMarqueePreference();
    const [saveError, setSaveError] = useState(false);
    const pathname = usePathname() ?? "/";
    const router = useRouter();

    return (
        <Flex direction="column" gap="6">
            {showMarqueeSetting && (
                <Flex direction="column" gap="3">
                    <Switch
                        size="l"
                        checked={hidden}
                        onUpdate={(value) => setSaveError(!setHidden(value))}
                    >
                        {t("hideMarquee")}
                    </Switch>
                    {saveError && (
                        <Alert theme="danger" message={t("marqueeSaveError")} />
                    )}
                </Flex>
            )}
            <Flex direction="column" gap="3">
                <Text variant="subheader-2">{t("theme")}</Text>
                <RadioGroup
                    size="l"
                    direction="vertical"
                    value={preference}
                    aria-label={t("theme")}
                    className={styles.options}
                    optionClassName={styles.option}
                    options={THEMES.map((value) => ({
                        value,
                        content: t(value),
                    }))}
                    onUpdate={(value) => {
                        if (THEMES.includes(value as ThemePreference)) {
                            setPreference(value as ThemePreference);
                        }
                    }}
                />
            </Flex>
            <Flex direction="column" gap="3">
                <Text variant="subheader-2">{t("language")}</Text>
                <RadioGroup
                    size="l"
                    direction="vertical"
                    value={languages.locale}
                    disabled={languages.pending}
                    aria-label={t("language")}
                    className={styles.options}
                    optionClassName={styles.option}
                    options={languages.choices.map((choice) => ({
                        value: choice.locale,
                        content: (
                            <Flex alignItems="center" gap="3">
                                <LoadedImage
                                    src={flagAsset(choice.country)}
                                    alt=""
                                    width={30}
                                    height={20}
                                    className={styles.flag}
                                />
                                <Text>{choice.label}</Text>
                            </Flex>
                        ),
                    }))}
                    onUpdate={(value) => {
                        const choice = languages.choices.find(
                            (item) => item.locale === value,
                        );
                        if (!choice || choice.locale === languages.locale) {
                            return;
                        }
                        if (
                            /^\/[a-z][a-z0-9-]{1,31}$/.test(pathname) &&
                            !["/ru", "/en"].includes(pathname)
                        ) {
                            document.cookie = `PERSONS_LOCALE=${choice.locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
                            router.refresh();
                        } else {
                            languages.choose(choice.locale);
                        }
                    }}
                />
            </Flex>
        </Flex>
    );
}
