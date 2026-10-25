'use client';

import { RequestError } from '@persons/ui/loading/RequestError';

import { Alert, Box, Flex, Text } from '@gravity-ui/uikit';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { postSignInHref } from '@/modules/id/model/postSignInHref';
import { useHydrated } from '@/shared/hooks/useHydrated';
import { ScreenSkeleton } from '@/shared/ui/ScreenSkeleton/ScreenSkeleton';
import type { Register } from '@persons/id-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { CredentialsForm } from '@/modules/id/components/CredentialsForm/CredentialsForm';
import { DetailsForm } from '@/modules/id/components/DetailsForm/DetailsForm';
import { VerificationForm } from '@/modules/id/components/VerificationForm/VerificationForm';
import { ProfileForm } from '@/modules/id/components/ProfileForm/ProfileForm';
import { StepIndicator } from '@/modules/id/components/StepIndicator/StepIndicator';
import {
    beginRegistration,
    beginRecovery,
    signIn,
    verifyCode,
    resendCode,
    finishRegistration,
} from '@/modules/id/actions/id';
import type { BrowserChallenge } from '@/modules/id/model/ActionResult';
import type { IdScreenProps } from '@/modules/id/screens/IdScreen/IdScreen.types';
import styles from '@/modules/id/screens/IdScreen/IdScreen.module.css';

const REGISTRATION_STEP_1 = 1;
const REGISTRATION_STEP_2 = 2;
const REGISTRATION_STEP_3 = 3;

type Stage = 'login' | 'details' | 'verify' | 'profile' | 'recovery';

export function IdScreen({ initialStage = 'login', initialError }: IdScreenProps) {
    const t = useTranslate('id');
    const locale = useLocale() === 'en' ? 'en' : 'ru';
    const router = useRouter();
    const search = useSearchParams();
    const returnQuery = search.has('returnTo')
        ? `?returnTo=${encodeURIComponent(postSignInHref(locale, search.toString()))}`
        : '';
    const [stage, setStage] = useState<Stage>(initialStage);
    const [recovering, setRecovering] = useState(false);
    const [details, setDetails] = useState<Register>({
        firstName: '',
        lastName: '',
        patronymic: '',
        email: '',
        locale,
    });
    const [challenge, setChallenge] = useState<BrowserChallenge>();
    const [error, setError] = useState<string | undefined>(initialError);
    const [success, setSuccess] = useState(false);
    const [pending, startTransition] = useTransition();
    const hydrated = useHydrated();

    if (!hydrated) {
        return <ScreenSkeleton />;
    }

    function change(next: Stage) {
        setError(undefined);
        setSuccess(false);
        setStage(next);
    }

    function credentials(email: string, password: string) {
        setError(undefined);
        startTransition(async () => {
            if (stage === 'recovery') {
                const result = await beginRecovery({ email, locale });

                if (result.ok) {
                    setChallenge(result.data);
                    setDetails((value) => ({ ...value, email }));
                    setRecovering(true);
                    change('verify');
                } else {
                    setError(result.code);
                }
            } else {
                const result = await signIn({ email, password });

                if (result.ok) {
                    window.location.assign(
                        new URL(postSignInHref(locale, window.location.search), window.location.origin).href,
                    );
                } else {
                    setError(result.code);
                }
            }
        });
    }

    function register() {
        setError(undefined);
        startTransition(async () => {
            const result = await beginRegistration({ ...details, locale });

            if (result.ok) {
                setChallenge(result.data);
                setRecovering(false);
                change('verify');
            } else {
                setError(result.code);
            }
        });
    }

    function verify(code: string) {
        if (!challenge) {
            return;
        }

        setError(undefined);
        startTransition(async () => {
            const result = await verifyCode(challenge.id, code);

            if (result.ok) {
                change('profile');
            } else {
                setError(result.code);
            }
        });
    }

    function resend() {
        if (!challenge) {
            return;
        }

        setError(undefined);
        startTransition(async () => {
            const result = await resendCode(challenge.id);

            if (result.ok) {
                setChallenge(result.data);
            } else {
                setError(result.code);
            }
        });
    }

    function finish(password: string, avatarBase64?: string) {
        setError(undefined);
        startTransition(async () => {
            const result = await finishRegistration({ password, avatarBase64 }, recovering);

            if (result.ok) {
                if (recovering) {
                    change('login');
                    setSuccess(true);
                } else {
                    window.location.assign(
                        new URL(postSignInHref(locale, window.location.search), window.location.origin).href,
                    );
                }
            } else {
                setError(result.code);
            }
        });
    }

    const title = {
        login: 'welcomeTitle',
        details: 'joinTitle',
        verify: 'verifyTitle',
        profile: recovering ? 'resetTitle' : 'profileTitle',
        recovery: 'recoveryTitle',
    }[stage];
    const subtitle = {
        login: undefined,
        details: 'joinSubtitle',
        verify: 'verifySubtitle',
        profile: recovering ? 'resetSubtitle' : 'profileSubtitle',
        recovery: 'recoverySubtitle',
    }[stage];
    const registrationStep =
        stage === 'details' ? REGISTRATION_STEP_1 : stage === 'verify' ? REGISTRATION_STEP_2 : REGISTRATION_STEP_3;

    return (
        <Box className={styles.root}>
            <Box key={stage} className={styles.stage}>
                <Box className={styles.body}>
                    {['details', 'verify', 'profile'].includes(stage) && !recovering && (
                        <StepIndicator step={registrationStep} />
                    )}
                    {title && (
                        <Flex direction="column" alignItems="center" gap="3" className={styles.heading}>
                            <Text as="h1" variant="header-1" className={styles.title}>
                                {t(title)}
                            </Text>
                            {subtitle && (
                                <Text color="secondary" className={styles.subtitle}>
                                    {t(subtitle, { email: details.email })}
                                </Text>
                            )}
                        </Flex>
                    )}
                    {error && (
                        <RequestError code={error}>
                            <Alert theme="danger" message={t(error)} className={styles.alert} />
                        </RequestError>
                    )}
                    {success && <Alert theme="success" message={t('resetSuccess')} className={styles.alert} />}
                    {(stage === 'login' || stage === 'recovery') && (
                        <CredentialsForm
                            pending={pending}
                            recovery={stage === 'recovery'}
                            returnTo={postSignInHref(locale, search.toString())}
                            onSubmit={credentials}
                            onForgot={() => router.push(`/${locale}/recovery${returnQuery}`)}
                            onRegister={() => {
                                setRecovering(false);
                                change('details');
                            }}
                            onBack={() => router.push(`/${locale}${returnQuery}`)}
                        />
                    )}
                    {stage === 'details' && (
                        <DetailsForm
                            value={details}
                            onChange={setDetails}
                            pending={pending}
                            onSubmit={register}
                            onBack={() => change('login')}
                        />
                    )}
                    {stage === 'verify' && challenge && (
                        <VerificationForm
                            key={challenge.resendAt}
                            pending={pending}
                            resendAt={challenge.resendAt}
                            onSubmit={verify}
                            onResend={resend}
                            onBack={() => change(recovering ? 'recovery' : 'details')}
                        />
                    )}
                    {stage === 'profile' && (
                        <ProfileForm
                            name={`${details.firstName} ${details.lastName}`}
                            recovery={recovering}
                            pending={pending}
                            onSubmit={finish}
                            onBack={() => change('verify')}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
}
