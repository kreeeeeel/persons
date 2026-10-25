'use client';

import { Box, Button, Flex, PinInput, Text } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';
import { useTranslate } from '@persons/i18n';
import { PendingButton } from '@/shared/ui/PendingButton/PendingButton';
import styles from '@/modules/id/components/VerificationForm/VerificationForm.module.css';

const VERIFICATION_CODE_LENGTH = 6;
const INITIAL_COUNTDOWN_SECONDS = 0;
const MILLISECONDS_PER_SECOND = 1000;
const COUNTDOWN_FINISHED = 0;
const COUNTDOWN_INTERVAL_MILLIS = 1000;

export function VerificationForm({
    pending,
    resendAt,
    onSubmit,
    onResend,
    onBack,
}: {
    readonly pending: boolean;
    readonly resendAt: string;
    readonly onSubmit: (code: string) => void;
    readonly onResend: () => void;
    readonly onBack: () => void;
}) {
    const t = useTranslate('id');
    const common = useTranslate('common');
    const [code, setCode] = useState<string[]>(Array(VERIFICATION_CODE_LENGTH).fill(''));
    const [seconds, setSeconds] = useState(() =>
        Math.max(
            INITIAL_COUNTDOWN_SECONDS,
            Math.ceil((new Date(resendAt).getTime() - Date.now()) / MILLISECONDS_PER_SECOND),
        ),
    );

    useEffect(() => {
        function tick() {
            setSeconds(
                Math.max(
                    COUNTDOWN_FINISHED,
                    Math.ceil((new Date(resendAt).getTime() - Date.now()) / MILLISECONDS_PER_SECOND),
                ),
            );
        }

        const timer = window.setInterval(tick, COUNTDOWN_INTERVAL_MILLIS);

        return () => window.clearInterval(timer);
    }, [resendAt]);

    return (
        <Box
            as="form"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(code.join(''));
            }}
            aria-busy={pending}
        >
            <Flex direction="column" gap="4">
                <PinInput
                    id="confirmation-code"
                    length={VERIFICATION_CODE_LENGTH}
                    size="xl"
                    value={code}
                    onUpdate={setCode}
                    otp
                    autoFocus
                    responsive
                    disabled={pending}
                    aria-label={t('code')}
                    className={styles.code}
                />
                <Flex justifyContent="start">
                    {seconds > COUNTDOWN_FINISHED ? (
                        <Text color="hint" variant="caption-2">
                            {t('resendTimer', { seconds })}
                        </Text>
                    ) : (
                        <Button view="flat" size="l" onClick={onResend} disabled={pending}>
                            {t('resend')}
                        </Button>
                    )}
                </Flex>
                <PendingButton pending={pending} disabled={code.join('').length !== VERIFICATION_CODE_LENGTH}>
                    {t('verify')}
                </PendingButton>
                <Button view="flat" size="xl" width="max" onClick={onBack} disabled={pending}>
                    {common('back')}
                </Button>
            </Flex>
        </Box>
    );
}
