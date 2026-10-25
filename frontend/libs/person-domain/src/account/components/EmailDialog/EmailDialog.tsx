"use client";

import { RequestError } from "@persons/ui/loading/RequestError";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslate } from "@persons/i18n";
import {
    Box,
    Button,
    Dialog,
    PasswordInput,
    PinInput,
    Text,
    TextInput,
} from "@gravity-ui/uikit";
import { PendingButton } from "@persons/person-domain/account/components/PendingButton/PendingButton";
import type { EmailChallenge } from "@persons/person-domain/account/model/EmailChallenge";
import type { EmailDialogProps } from "@persons/person-domain/account/components/EmailDialog/EmailDialog.types";
import styles from "@persons/person-domain/account/components/AccountDialog/AccountDialog.module.css";

const VERIFICATION_CODE_LENGTH = 6;
const INITIAL_COUNTDOWN_SECONDS = 0;
const COUNTDOWN_FINISHED = 0;
const MILLISECONDS_PER_SECOND = 1000;
const COUNTDOWN_INTERVAL_MILLIS = 1000;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_BYTES = 72;

export function EmailDialog({
    email: currentEmail,
    onClose,
    embedded = false,
    actions,
}: EmailDialogProps) {
    const { beginEmailChange, confirmEmailChange, resendEmailCode } = actions;
    const t = useTranslate("account");
    const locale = useLocale();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [challenge, setChallenge] = useState<EmailChallenge>();
    const [code, setCode] = useState<string[]>(
        Array(VERIFICATION_CODE_LENGTH).fill(""),
    );
    const [remaining, setRemaining] = useState(INITIAL_COUNTDOWN_SECONDS);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!challenge) {
            return;
        }

        const update = () =>
            setRemaining(
                Math.max(
                    COUNTDOWN_FINISHED,
                    Math.ceil(
                        (new Date(challenge.resendAt).getTime() - Date.now()) /
                            MILLISECONDS_PER_SECOND,
                    ),
                ),
            );

        update();

        const timer = window.setInterval(update, COUNTDOWN_INTERVAL_MILLIS);

        return () => window.clearInterval(timer);
    }, [challenge]);

    async function submit(event: { preventDefault: () => void }) {
        event.preventDefault();

        if (pending) {
            return;
        }

        setPending(true);
        setError("");

        if (challenge) {
            const result = await confirmEmailChange(
                challenge.id,
                code.join(""),
            );

            if (result.ok) {
                setSuccess(true);
                router.refresh();
            } else {
                setError(result.code);
            }
        } else {
            const result = await beginEmailChange({
                email,
                currentPassword: password,
                locale,
            });

            if (result.ok) {
                setEmail(email.trim().toLowerCase());
                setPassword("");
                setChallenge(result.data);
            } else {
                setError(result.code);
            }
        }

        setPending(false);
    }

    async function resend() {
        if (!challenge || pending || remaining > COUNTDOWN_FINISHED) {
            return;
        }

        setPending(true);
        setError("");

        const result = await resendEmailCode(challenge.id);

        if (result.ok) {
            setChallenge(result.data);
            setCode(Array(VERIFICATION_CODE_LENGTH).fill(""));
        } else {
            setError(result.code);
        }

        setPending(false);
    }

    const body = (
        <Box className={styles.body}>
            {success ? (
                <Box className={styles.success}>
                    <Text variant="body-3">
                        {t("emailUpdatedDescription", { email })}
                    </Text>
                    <Button view="action" size="xl" onClick={onClose}>
                        {t("done")}
                    </Button>
                </Box>
            ) : (
                <Box
                    as="form"
                    className={styles.form}
                    onSubmit={submit}
                    autoComplete="off"
                >
                    {challenge ? (
                        <>
                            <Text variant="body-3">
                                {t("sentCode", { email })}
                            </Text>
                            <PinInput
                                className={styles.code}
                                value={code}
                                onUpdate={setCode}
                                length={VERIFICATION_CODE_LENGTH}
                                size="xl"
                                otp
                                autoFocus
                                responsive
                                disabled={pending}
                                aria-label={t("code")}
                            />
                            <Button
                                view="flat"
                                size="l"
                                disabled={
                                    pending || remaining > COUNTDOWN_FINISHED
                                }
                                onClick={resend}
                            >
                                {remaining > COUNTDOWN_FINISHED
                                    ? t("resendTimer", {
                                          seconds: remaining,
                                      })
                                    : t("resend")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Text variant="body-2" color="secondary">
                                {t("currentEmail", { email: currentEmail })}
                            </Text>
                            <Box className={styles.field}>
                                <Text
                                    as="label"
                                    htmlFor="new-email"
                                    variant="body-3"
                                >
                                    {t("newEmail")}
                                </Text>
                                <TextInput
                                    id="new-email"
                                    type="email"
                                    value={email}
                                    onUpdate={setEmail}
                                    autoComplete="email"
                                    size="xl"
                                    disabled={pending}
                                    autoFocus
                                    controlProps={{
                                        required: true,
                                        maxLength: MAX_EMAIL_LENGTH,
                                    }}
                                />
                            </Box>
                            <Box className={styles.field}>
                                <Text
                                    as="label"
                                    htmlFor="email-password"
                                    variant="body-3"
                                >
                                    {t("currentPassword")}
                                </Text>
                                <PasswordInput
                                    id="email-password"
                                    value={password}
                                    onUpdate={setPassword}
                                    autoComplete="off"
                                    size="xl"
                                    hideCopyButton
                                    disabled={pending}
                                    controlProps={{
                                        required: true,
                                        maxLength: MAX_PASSWORD_BYTES,
                                    }}
                                />
                            </Box>
                            <Text variant="body-2" color="secondary">
                                {t("emailNotice")}
                            </Text>
                        </>
                    )}
                    {error && (
                        <RequestError code={error}>
                            <Text role="alert" className={styles.error}>
                                {t(error)}
                            </Text>
                        </RequestError>
                    )}
                    <Box className={challenge ? styles.actions : undefined}>
                        {challenge && (
                            <Button
                                view="flat"
                                size="xl"
                                disabled={pending}
                                onClick={() => {
                                    setChallenge(undefined);
                                    setCode(
                                        Array(VERIFICATION_CODE_LENGTH).fill(
                                            "",
                                        ),
                                    );
                                    setError("");
                                }}
                            >
                                {t("changeAddress")}
                            </Button>
                        )}
                        <PendingButton
                            pending={pending}
                            width={challenge ? "auto" : "max"}
                            disabled={
                                challenge
                                    ? code.join("").length !==
                                      VERIFICATION_CODE_LENGTH
                                    : !email || !password
                            }
                        >
                            {t(challenge ? "confirmEmail" : "sendCode")}
                        </PendingButton>
                    </Box>
                </Box>
            )}
        </Box>
    );

    if (embedded) {
        return body;
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!pending) {
                    onClose();
                }
            }}
            maxWidth="s"
            fullWidth
            hasCloseButton
            aria-label={t("email")}
        >
            <Dialog.Header
                caption={
                    success
                        ? t("emailUpdated")
                        : challenge
                          ? t("checkEmail")
                          : t("email")
                }
            />
            {body}
        </Dialog>
    );
}
