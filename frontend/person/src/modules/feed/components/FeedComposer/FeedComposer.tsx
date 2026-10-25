'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, FilePreview, Flex, Icon, Text, TextArea } from '@gravity-ui/uikit';
import { Paperclip, Xmark } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import { FileDropDialog } from '@persons/ui/FileDropDialog';
import type { PersonSummary } from '@persons/person-client';
import { PublicationTarget } from '@/modules/feed/components/PublicationTarget/PublicationTarget';
import { feedFileAccept, feedFileKind, validateFeedFiles } from '@/modules/feed/model/feedFiles';
import styles from '@/modules/feed/components/FeedComposer/FeedComposer.module.css';

export function FeedComposer({
    onPublish,
    disabled = false,
    target,
    ownPage,
    onTargetChange,
}: {
    readonly onPublish: (text: string, files: readonly File[]) => Promise<void>;
    readonly disabled?: boolean;
    readonly target?: PersonSummary;
    readonly ownPage?: PersonSummary;
    readonly onTargetChange: (page: PersonSummary) => void;
}) {
    const t = useTranslate('feed');
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState<readonly { readonly file: File; readonly url?: string }[]>([]);
    const urls = useRef(new Set<string>());
    const [choosing, setChoosing] = useState(false);
    const [fileError, setFileError] = useState<ReturnType<typeof validateFeedFiles>>();
    const [failed, setFailed] = useState(false);
    const [pending, setPending] = useState(false);
    useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);
    const files = attachments.map((item) => item.file);

    function release(url?: string) {
        if (url) {
            URL.revokeObjectURL(url);
            urls.current.delete(url);
        }
    }

    function select(next: File[]) {
        const combined = [...files, ...next];
        const error = validateFeedFiles(combined);
        setFileError(error);
        if (!error) {
            const added = next.map((file) => {
                const url = feedFileKind(file) === 'photo' ? URL.createObjectURL(file) : undefined;
                if (url) {
                    urls.current.add(url);
                }
                return { file, url };
            });
            setAttachments((current) => [...current, ...added]);
            setChoosing(false);
        }
    }

    async function publish() {
        if (pending || disabled || (!text.trim() && !files.length)) {
            return;
        }
        setPending(true);
        setFailed(false);
        try {
            await onPublish(text.trim(), files);
            setText('');
            attachments.forEach((item) => release(item.url));
            setAttachments([]);
        } catch {
            setFailed(true);
        } finally {
            setPending(false);
        }
    }

    const photos = files.filter((file) => feedFileKind(file) === 'photo').length;
    const moments = files.length - photos;
    return (
        <Box as="section" aria-label={t('composerTitle')} className={styles.composer}>
            <Flex gap="3" alignItems="center" wrap>
                <Text as="h2" className={styles.title}>
                    {t('composerTitle')}
                </Text>
                <Flex gap="2" className={styles.destination}>
                    {!files.length && <Text>{t('destinationWall')}</Text>}
                    {photos > 0 && <Text>{t('destinationPhoto', { count: photos })}</Text>}
                    {moments > 0 && <Text>{t('destinationMoment', { count: moments })}</Text>}
                </Flex>
            </Flex>
            <TextArea
                className={styles.input}
                value={text}
                view="clear"
                size="l"
                minRows={2}
                maxRows={8}
                disabled={pending || disabled}
                placeholder={t('placeholder')}
                controlProps={{ 'aria-label': t('textLabel'), maxLength: files.length ? 200 : 2000 }}
                onUpdate={setText}
            />
            {files.length > 0 && (
                <Box className={styles.files}>
                    {files.map((file, index) => (
                        <FilePreview
                            key={`${file.name}:${index}`}
                            file={file}
                            imageSrc={attachments[index].url}
                            description={t(feedFileKind(file))}
                            actions={[
                                {
                                    icon: <Icon data={Xmark} size={16} />,
                                    title: t('remove', { name: file.name }),
                                    disabled: pending,
                                    onClick: () => {
                                        release(attachments[index].url);
                                        setAttachments((values) => values.filter((_, position) => position !== index));
                                    },
                                },
                            ]}
                        />
                    ))}
                </Box>
            )}
            {failed && (
                <Box role="alert">
                    <Alert theme="danger" message={t('publishError')} />
                </Box>
            )}
            <Flex justifyContent="space-between" alignItems="center" gap="3" wrap className={styles.actions}>
                <Flex gap="2" className={styles.tools}>
                    <PublicationTarget
                        value={target}
                        ownPage={ownPage}
                        disabled={pending || disabled}
                        onChange={onTargetChange}
                    />
                    <Button
                        size="l"
                        view="flat"
                        className={styles.button}
                        aria-label={t('attach')}
                        disabled={pending || disabled}
                        onClick={() => {
                            setFileError(undefined);
                            setChoosing(true);
                        }}
                    >
                        <Icon data={Paperclip} size={18} />
                        <Text className={styles.desktopLabel}>{t('attach')}</Text>
                        <Text className={styles.mobileLabel}>{t('files')}</Text>
                    </Button>
                </Flex>
                <Button
                    size="l"
                    view="action"
                    className={`${styles.button} ${styles.submit}`}
                    loading={pending}
                    disabled={disabled || !target || (!text.trim() && !files.length)}
                    onClick={() => void publish()}
                >
                    {t('publish')}
                </Button>
            </Flex>
            {choosing && (
                <FileDropDialog
                    title={t('attach')}
                    description={t('filesDescription')}
                    chooseLabel={t('chooseFiles')}
                    hint={t('filesHint')}
                    illustration="/media/upload-evgeny-v1.webp"
                    illustrationAlt={t('uploadAlt')}
                    accept={feedFileAccept}
                    error={fileError && t(fileError)}
                    onSelect={select}
                    onClose={() => setChoosing(false)}
                />
            )}
        </Box>
    );
}
