'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Dialog, Text } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui/LoadedImage';
import { LoadingFailureContext } from '@persons/ui/loading/LoadingFailureContext';
import type { LoadingFailureProviderProps } from '@persons/ui/loading/LoadingFailureProvider.types';
import styles from '@persons/ui/loading/LoadingFailureProvider.module.css';

const FIRST_FAILURE_INDEX = 0;
const ILLUSTRATION_WIDTH = 1536;
const ILLUSTRATION_HEIGHT = 1024;

const RECOVERY_GRACE_MILLIS = 30000;

export function LoadingFailureProvider(props: LoadingFailureProviderProps) {
    const [open, setOpen] = useState(false);
    const sources = useRef(new Set<string>());
    const notified = useRef(false);
    const recoveryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const titleId = useId();
    const descriptionId = useId();
    const report = useCallback((source: string, failed: boolean) => {
        if (failed) {
            clearTimeout(recoveryTimer.current);
            sources.current.add(source);

            if (!notified.current) {
                notified.current = true;
                setOpen(true);
            }
        } else {
            const recovered = sources.current.delete(source);

            if (recovered && sources.current.size === FIRST_FAILURE_INDEX) {
                setOpen(false);
                clearTimeout(recoveryTimer.current);
                recoveryTimer.current = setTimeout(() => {
                    notified.current = false;
                }, RECOVERY_GRACE_MILLIS);
            }
        }
    }, []);

    useEffect(() => () => clearTimeout(recoveryTimer.current), []);

    return (
        <LoadingFailureContext value={report}>
            {props.children}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                hasCloseButton={false}
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                modalClassName={styles.modal}
            >
                <Dialog.Body className={styles.body}>
                    <LoadedImage
                        src={props.illustrationSrc}
                        alt={props.illustrationAlt}
                        width={ILLUSTRATION_WIDTH}
                        height={ILLUSTRATION_HEIGHT}
                        responsive
                    />
                    <Text as="h2" variant="header-1" id={titleId} className={styles.title}>
                        {props.title}
                    </Text>
                    <Text as="p" variant="body-3" color="secondary" id={descriptionId} className={styles.description}>
                        {props.description}
                    </Text>
                    <Button view="action" size="xl" width="max" onClick={() => window.location.reload()}>
                        {props.acknowledge}
                    </Button>
                </Dialog.Body>
            </Dialog>
        </LoadingFailureContext>
    );
}
