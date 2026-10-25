'use client';

import { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, Flex, Icon, Text } from '@gravity-ui/uikit';
import { FileArrowUp } from '@gravity-ui/icons';
import { LoadedImage } from '@persons/ui/LoadedImage';
import type { FileDropDialogProps } from '@persons/ui/FileDropDialog/FileDropDialog.types';
import styles from '@persons/ui/FileDropDialog/FileDropDialog.module.css';

export function FileDropDialog({
    title,
    description,
    chooseLabel,
    hint,
    illustration,
    illustrationAlt,
    accept,
    error,
    multiple,
    onSelect,
    onClose,
}: FileDropDialogProps) {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    return (
        <Dialog
            open
            hasCloseButton
            fullWidth
            modalClassName={styles.modal}
            contentOverflow="auto"
            onClose={onClose}
            aria-label={title}
        >
            <Dialog.Header caption={title} />
            <Dialog.Body className={styles.body}>
                <Flex direction="column" gap="4">
                    {error && <Alert theme="danger" message={error} />}
                    <Flex
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        gap="4"
                        className={styles.zone}
                        data-dragging={dragging}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={(event) => {
                            if (
                                !(event.relatedTarget instanceof Node) ||
                                !(event.currentTarget as unknown as HTMLElement).contains(event.relatedTarget)
                            ) {
                                setDragging(false);
                            }
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            onSelect(Array.from(event.dataTransfer.files));
                        }}
                    >
                        <Box className={styles.art}>
                            <LoadedImage src={illustration} alt={illustrationAlt} width={360} height={260} responsive />
                        </Box>
                        <Text className={styles.description}>{description}</Text>
                        <Button view="action" size="l" onClick={() => input.current?.click()}>
                            <Icon data={FileArrowUp} size={20} />
                            {chooseLabel}
                        </Button>
                        <Text color="secondary" className={styles.hint}>
                            {hint}
                        </Text>
                    </Flex>
                    <Box
                        as="input"
                        ref={input}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        aria-label={chooseLabel}
                        className={styles.input}
                        onChange={() => {
                            onSelect(Array.from(input.current?.files ?? []));
                            if (input.current) {
                                input.current.value = '';
                            }
                        }}
                    />
                </Flex>
            </Dialog.Body>
        </Dialog>
    );
}
