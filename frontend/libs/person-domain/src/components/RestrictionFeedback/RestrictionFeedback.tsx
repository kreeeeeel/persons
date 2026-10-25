"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import type { RestrictionErrorResponse } from "@persons/person-client";
import { RESTRICTION_EVENT } from "@persons/person-domain/restrictions/notice";
import { RestrictionNotice } from "@persons/person-domain/RestrictionNotice";
import type { RestrictionFeedbackProps } from "@persons/person-domain/RestrictionFeedback/RestrictionFeedback.types";

export function RestrictionFeedback({ children }: RestrictionFeedbackProps) {
    const locale = useLocale();
    const t = useTranslate("person");
    const [notice, setNotice] = useState<RestrictionErrorResponse>();
    useEffect(() => {
        const receive = (event: Event) => {
            const detail = (event as CustomEvent<RestrictionErrorResponse>)
                .detail;
            if (
                detail.scope === "ACCOUNT" ||
                detail.restriction.scopes.includes("ACCOUNT")
            ) {
                window.location.assign(
                    new URL(`/${locale}/blocked`, window.location.origin).href,
                );
            } else {
                setNotice(detail);
            }
        };
        window.addEventListener(RESTRICTION_EVENT, receive);
        return () => window.removeEventListener(RESTRICTION_EVENT, receive);
    }, [locale]);
    return (
        <>
            {children}
            {notice && (
                <Dialog
                    open
                    hasCloseButton
                    maxWidth="m"
                    fullWidth
                    contentOverflow="auto"
                    onClose={() => setNotice(undefined)}
                    aria-label={t("actionRestricted")}
                >
                    <Dialog.Header caption={t("actionRestricted")} />
                    <Dialog.Body>
                        <RestrictionNotice
                            restriction={notice.restriction}
                            scope={notice.scope}
                        />
                    </Dialog.Body>
                    <Dialog.Footer
                        textButtonApply={t("understood")}
                        onClickButtonApply={() => setNotice(undefined)}
                    />
                </Dialog>
            )}
        </>
    );
}
