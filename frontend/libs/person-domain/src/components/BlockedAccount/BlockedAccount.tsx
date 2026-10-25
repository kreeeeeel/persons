"use client";

import { useState } from "react";
import { Box, Button, Flex, Text } from "@gravity-ui/uikit";
import { useTranslate } from "@persons/i18n";
import { RestrictionNotice } from "@persons/person-domain/RestrictionNotice";
import type { BlockedAccountProps } from "@persons/person-domain/BlockedAccount/BlockedAccount.types";
import styles from "@persons/person-domain/BlockedAccount/BlockedAccount.module.css";

export function BlockedAccount({
    restriction,
    signOut,
    homeUrl,
}: BlockedAccountProps) {
    const t = useTranslate("person");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    return (
        <Box as="main" className={styles.page}>
            <Flex
                direction="column"
                alignItems="center"
                gap="5"
                className={styles.content}
            >
                <RestrictionNotice restriction={restriction} scope="ACCOUNT" />
                {error && (
                    <Text color="danger" role="alert">
                        {t("UNAVAILABLE")}
                    </Text>
                )}
                <Button
                    size="l"
                    view="normal"
                    loading={pending}
                    onClick={async () => {
                        setPending(true);
                        setError(false);
                        const result = await signOut();
                        if (result.ok) {
                            window.location.assign(homeUrl);
                        } else {
                            setPending(false);
                            setError(true);
                        }
                    }}
                >
                    {t("signOutDevice")}
                </Button>
            </Flex>
        </Box>
    );
}
