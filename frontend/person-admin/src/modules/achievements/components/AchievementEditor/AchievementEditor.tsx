'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, Flex, Select, Switch, Text, TextArea } from '@gravity-ui/uikit';
import { AchievementType } from '@persons/person-client';
import { LabeledTextInput as TextInput } from '@persons/ui/LabeledTextInput';
import { FileDropDialog } from '@persons/ui/FileDropDialog';
import { LoadedImage } from '@persons/ui';
import { useTranslate } from '@persons/i18n';
import { personClient } from '@persons/person-domain/api/browser';
import { usePersonMutation } from '@persons/person-domain/hooks/usePersonMutation';
import { MutationFeedback } from '@persons/person-domain/MutationFeedback';
import type { AchievementEditorProps } from '@/modules/achievements/components/AchievementEditor/AchievementEditor.types';
import styles from '@/modules/achievements/components/AchievementEditor/AchievementEditor.module.css';

const MAX_BYTES = 12 * 1024 * 1024;
const PAGE_AGE_YEARS = [1, 2, 3, 4, 5];

export function AchievementEditor({ achievement, onClose, onSaved }: AchievementEditorProps) {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const [title, setTitle] = useState(achievement?.title ?? '');
    const [description, setDescription] = useState(achievement?.description ?? '');
    const [active, setActive] = useState(achievement?.active ?? true);
    const [type, setType] = useState(achievement?.type ?? AchievementType.Manual);
    const [pageAgeYears, setPageAgeYears] = useState(achievement?.pageAgeYears ?? PAGE_AGE_YEARS[0]);
    const [image, setImage] = useState<{ file: File; url: string }>();
    const [selecting, setSelecting] = useState(!achievement);
    const [fileError, setFileError] = useState<string>();
    const urls = useRef<string[]>([]);
    const mutation = usePersonMutation();
    useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

    function select(files: File[]) {
        const file = files[0];
        if (!file) {
            return;
        }
        const error =
            file.size > MAX_BYTES
                ? 'MEDIA_TOO_LARGE'
                : !file.size || !['image/jpeg', 'image/png'].includes(file.type)
                  ? 'INVALID_MEDIA'
                  : undefined;
        setFileError(error);
        if (error) {
            return;
        }
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        setImage({ file, url });
        setSelecting(false);
    }

    async function save() {
        if (!achievement) {
            if (image) {
                await personClient.achievements.createAchievement({
                    title: title.trim(),
                    description,
                    file: image.file,
                    type,
                    active,
                    pageAgeYears: type === AchievementType.Automatic ? pageAgeYears : undefined,
                });
            }
            return;
        }
        const current = image
            ? await personClient.achievements.updateAchievementImage({ id: achievement.id, file: image.file })
            : achievement;
        await personClient.achievements.updateAchievement({
            id: current.id,
            achievementInput: {
                title: title.trim(),
                description,
                active,
                version: current.version,
                type,
                pageAgeYears: type === AchievementType.Automatic ? pageAgeYears : undefined,
            },
        });
    }

    if (selecting) {
        return (
            <FileDropDialog
                title={t('achievementImage')}
                description={t('dropFileDescription')}
                chooseLabel={t('chooseFile')}
                hint={cms('achievementImageHint')}
                accept="image/jpeg,image/png"
                illustration="/media/upload-evgeny-v1.webp"
                illustrationAlt={t('uploadIllustration')}
                error={fileError && t(fileError)}
                onSelect={select}
                onClose={() => {
                    if (achievement || image) {
                        setSelecting(false);
                    } else {
                        onClose();
                    }
                }}
            />
        );
    }

    return (
        <Dialog
            open
            maxWidth="m"
            fullWidth
            hasCloseButton
            modalClassName={styles.modal}
            contentOverflow="auto"
            disableOutsideClick={mutation.pending}
            disableEscapeKeyDown={mutation.pending}
            aria-label={t(achievement ? 'edit' : 'createAchievement')}
            onClose={() => {
                if (!mutation.pending) {
                    onClose();
                }
            }}
        >
            <Dialog.Header caption={t(achievement ? 'edit' : 'createAchievement')} />
            <Dialog.Body>
                <Flex direction="column" gap="3">
                    <MutationFeedback {...mutation} />
                    <Flex direction="column" alignItems="center" gap="2">
                        <Box className={styles.preview}>
                            <LoadedImage
                                key={image?.url ?? achievement?.version}
                                src={
                                    image?.url ??
                                    `/api/person/v1/achievements/${achievement?.id}/image?v=${achievement?.version}`
                                }
                                alt={title || t('achievementImage')}
                                width={160}
                                height={160}
                                objectFit="contain"
                            />
                        </Box>
                        <Button view="flat" size="m" disabled={mutation.pending} onClick={() => setSelecting(true)}>
                            {cms('replaceImage')}
                        </Button>
                    </Flex>
                    <Flex direction="column" alignItems="flex-start" gap="2">
                        <Text as="label" htmlFor="achievement-type">
                            {t('achievementType')}
                        </Text>
                        <Select
                            id="achievement-type"
                            aria-label={t('achievementType')}
                            size="l"
                            disabled={mutation.pending}
                            value={[type]}
                            onUpdate={([value]) => {
                                if (value === AchievementType.Manual || value === AchievementType.Automatic) {
                                    setType(value);
                                }
                            }}
                            options={[
                                { value: AchievementType.Manual, content: t('achievementManual') },
                                { value: AchievementType.Automatic, content: t('achievementAutomatic') },
                            ]}
                        />
                    </Flex>
                    {type === AchievementType.Automatic && (
                        <Flex direction="column" alignItems="flex-start" gap="2">
                            <Text as="label" htmlFor="achievement-page-age">
                                {t('achievementPageAge')}
                            </Text>
                            <Select
                                id="achievement-page-age"
                                aria-label={t('achievementPageAge')}
                                size="l"
                                disabled={mutation.pending}
                                value={[String(pageAgeYears)]}
                                onUpdate={([value]) => {
                                    const years = Number(value);
                                    if (PAGE_AGE_YEARS.includes(years)) {
                                        setPageAgeYears(years);
                                    }
                                }}
                                options={PAGE_AGE_YEARS.map((years) => ({
                                    value: String(years),
                                    content: t('achievementYears', { years }),
                                }))}
                            />
                        </Flex>
                    )}
                    <TextInput
                        size="l"
                        value={title}
                        onUpdate={setTitle}
                        label={t('achievementTitle')}
                        disabled={mutation.pending}
                        controlProps={{ 'aria-label': t('achievementTitle'), maxLength: 100 }}
                    />
                    <Text as="label" htmlFor="achievement-description">
                        {t('achievementDescription')}
                    </Text>
                    <TextArea
                        id="achievement-description"
                        size="l"
                        value={description}
                        onUpdate={setDescription}
                        minRows={2}
                        disabled={mutation.pending}
                        controlProps={{ 'aria-label': t('achievementDescription'), maxLength: 1000 }}
                    />
                    <Switch size="l" checked={active} onUpdate={setActive} disabled={mutation.pending}>
                        {cms('availableToGrant')}
                    </Switch>
                </Flex>
            </Dialog.Body>
            <Dialog.Footer
                textButtonCancel={t('cancel')}
                onClickButtonCancel={onClose}
                textButtonApply={t('saveDirect')}
                loading={mutation.pending}
                propsButtonApply={{ disabled: !title.trim() || (!achievement && !image) }}
                propsButtonCancel={{ disabled: mutation.pending }}
                onClickButtonApply={() => mutation.run(save, onSaved, false)}
            />
        </Dialog>
    );
}
