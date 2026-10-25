'use client';

import { Alert, Box, Button, Flex, Icon, Skeleton, Text } from '@gravity-ui/uikit';
import { FileArrowUp } from '@gravity-ui/icons';
import { useEffect, useRef, useState } from 'react';
import { LoadedAvatar } from '@persons/ui';
import { useTranslate } from '@persons/i18n';
import { PhotoEditor } from '@persons/photo-editor/PhotoEditor/PhotoEditor';
import { inspectPhoto, isPhotoSizeAllowed } from '@persons/photo-editor/image';
import type { PhotoIssue } from '@persons/photo-editor/image';
import styles from '@persons/photo-editor/AvatarPicker/AvatarPicker.module.css';

const MEDIUM_ICON_SIZE = 20;
const ON_CHANGE_0 = 0;

export function AvatarPicker({
    name,
    value,
    onChange,
    disabled = false,
    inlineEditor = false,
    onEditingChange,
}: {
    readonly name: string;
    readonly value?: string;
    readonly onChange: (value: string | undefined) => void;
    readonly disabled?: boolean;
    readonly inlineEditor?: boolean;
    readonly onEditingChange?: (editing: boolean) => void;
}) {
    const t = useTranslate('id');
    const editor = useTranslate('editor');
    const input = useRef<HTMLInputElement>(null);
    const [source, setSource] = useState<string>();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<PhotoIssue>();

    useEffect(
        () => () => {
            if (source) {
                URL.revokeObjectURL(source);
            }
        },
        [source],
    );

    async function load(file: File | undefined) {
        if (!file) {
            return;
        }

        setError(undefined);
        setLoading(true);

        let url: string | undefined;

        try {
            const issue = await inspectPhoto(file);

            if (issue) {
                setError(issue);

                return;
            }

            url = URL.createObjectURL(file);

            const image = new Image();

            image.src = url;
            await image.decode();

            if (!isPhotoSizeAllowed(image.naturalWidth, image.naturalHeight)) {
                URL.revokeObjectURL(url);
                setError('invalidDimensions');

                return;
            }

            setSource(url);
            setEditing(true);
            onEditingChange?.(true);
        } catch {
            if (url) {
                URL.revokeObjectURL(url);
            }

            setError('invalidFile');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Flex direction="column" alignItems="center" gap="3" className={styles.root}>
            <Box className={styles.preview} hidden={inlineEditor && editing}>
                {loading ? (
                    <Skeleton className={styles.avatarSkeleton} aria-label={t('upload')} />
                ) : (
                    <LoadedAvatar name={name} src={value} />
                )}
                <Button
                    view="action"
                    size="l"
                    pin="circle-circle"
                    className={styles.upload}
                    aria-label={t('upload')}
                    onClick={() => input.current?.click()}
                    disabled={loading || disabled}
                >
                    <Icon data={FileArrowUp} size={MEDIUM_ICON_SIZE} />
                </Button>
            </Box>
            <Box
                as="input"
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled || loading}
                aria-label={t('upload')}
                className={styles.fileInput}
                onChange={() => {
                    void load(input.current?.files?.[ON_CHANGE_0]);

                    if (input.current) {
                        input.current.value = '';
                    }
                }}
            />
            <Text color="secondary" variant="caption-2" className={styles.hint}>
                {t('avatarHint')}
            </Text>
            {error && <Alert theme="danger" message={editor(error)} />}
            {editing && source && (
                <PhotoEditor
                    source={source}
                    embedded={inlineEditor}
                    onClose={() => {
                        setEditing(false);
                        onEditingChange?.(false);
                    }}
                    onSave={(image) => {
                        onChange(image);
                        setEditing(false);
                        onEditingChange?.(false);
                    }}
                />
            )}
        </Flex>
    );
}
