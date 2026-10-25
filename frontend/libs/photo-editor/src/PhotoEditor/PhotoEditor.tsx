'use client';

import { Alert, Box, Button, Flex, Icon, Modal, Skeleton, Spin, Text } from '@gravity-ui/uikit';
import { ArrowRotateRight, ArrowsOppositeToDots, Xmark } from '@gravity-ui/icons';
import Cropper from 'react-easy-crop';
import type { Area, MediaSize } from 'react-easy-crop';
import { useRef, useState } from 'react';
import { useTranslate } from '@persons/i18n';
import { cropPhoto } from '@persons/photo-editor/crop';
import { selectedArea } from '@persons/photo-editor/selection';
import { CropSelection } from '@persons/photo-editor/PhotoEditor/components/CropSelection';
import type { PhotoEditorProps } from '@persons/photo-editor/PhotoEditor/PhotoEditor.types';
import styles from '@persons/photo-editor/PhotoEditor/PhotoEditor.module.css';

const X_0 = 0;
const Y_0 = 0;
const ZOOM_SET_ZOOM_1 = 1;
const ROTATION_SET_ROTATION_0 = 0;
const SIZE_1 = 1;
const FOCUSABLE_TAB_INDEX = 0;
const ON_KEY_DOWN_180 = 180;
const FIRST_SEARCH_RESULT_INDEX = 0;
const ON_KEY_DOWN_2 = 2;
const ON_KEY_DOWN_10 = 10;
const ASPECT_1 = 1;
const MIN_ZOOM_1 = 1;
const MAX_ZOOM_4 = 4;
const TRANSFORM_1 = 1;
const DISABLED_TAB_INDEX = 1;
const ON_ZOOM_1 = 1;
const ON_ZOOM_4 = 4;
const MEDIUM_ICON_SIZE = 20;
const ON_CLICK_90 = 90;
const ON_CLICK_360 = 360;
const EDITOR_ICON_SIZE = 22;

export function PhotoEditor({ source, onSave, onClose, embedded = false }: PhotoEditorProps) {
    const t = useTranslate('editor');
    const [crop, setCrop] = useState({ x: X_0, y: Y_0 });
    const [zoom, setZoom] = useState(ZOOM_SET_ZOOM_1);
    const [rotation, setRotation] = useState(ROTATION_SET_ROTATION_0);
    const [flipX, setFlipX] = useState(false);
    const [flipY, setFlipY] = useState(false);
    const [area, setArea] = useState<Area>();
    const [region, setRegion] = useState({
        x: X_0,
        y: Y_0,
        size: SIZE_1,
    });
    const [entered, setEntered] = useState(embedded);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);
    const media = useRef<MediaSize>(undefined);

    async function save() {
        if (!area || saving) {
            return;
        }

        setSaving(true);
        setError(false);

        try {
            onSave(await cropPhoto(source, selectedArea(area, region), rotation, flipX, flipY));
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    }

    const body = (
        <Flex direction="column" alignItems="center" className={`${styles.panel} ${embedded ? styles.embedded : ''}`}>
            <Box
                ref={viewport}
                className={styles.cropper}
                aria-busy={!ready}
                role="group"
                aria-label={t('image')}
                tabIndex={FOCUSABLE_TAB_INDEX}
                onKeyDown={(event) => {
                    const bounds = viewport.current?.getBoundingClientRect();

                    if (
                        event.target !== event.currentTarget ||
                        saving ||
                        !bounds ||
                        !media.current ||
                        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
                    ) {
                        return;
                    }

                    event.preventDefault();

                    const rotated = rotation % ON_KEY_DOWN_180 !== FIRST_SEARCH_RESULT_INDEX;
                    const width = rotated ? media.current.height : media.current.width;
                    const height = rotated ? media.current.width : media.current.height;
                    const maxX = Math.max(FIRST_SEARCH_RESULT_INDEX, (width * zoom - bounds.width) / ON_KEY_DOWN_2);
                    const maxY = Math.max(FIRST_SEARCH_RESULT_INDEX, (height * zoom - bounds.height) / ON_KEY_DOWN_2);
                    const dx =
                        event.key === 'ArrowLeft'
                            ? -ON_KEY_DOWN_10
                            : event.key === 'ArrowRight'
                              ? ON_KEY_DOWN_10
                              : FIRST_SEARCH_RESULT_INDEX;
                    const dy =
                        event.key === 'ArrowUp'
                            ? -ON_KEY_DOWN_10
                            : event.key === 'ArrowDown'
                              ? ON_KEY_DOWN_10
                              : FIRST_SEARCH_RESULT_INDEX;

                    setCrop((value) => ({
                        x: Math.max(-maxX, Math.min(maxX, value.x + dx)),
                        y: Math.max(-maxY, Math.min(maxY, value.y + dy)),
                    }));
                }}
            >
                {!ready && !error && <Skeleton className={styles.imageSkeleton} aria-label={t('loading')} />}
                {entered && (
                    <Cropper
                        image={source}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={ASPECT_1}
                        objectFit="cover"
                        cropShape="round"
                        showGrid={false}
                        minZoom={MIN_ZOOM_1}
                        maxZoom={MAX_ZOOM_4}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, pixels) => setArea(pixels)}
                        onMediaLoaded={() => setReady(true)}
                        setMediaSize={(size) => {
                            media.current = size;
                        }}
                        transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flipX ? -TRANSFORM_1 : TRANSFORM_1}) scaleY(${flipY ? -TRANSFORM_1 : TRANSFORM_1})`}
                        classes={{
                            containerClassName: styles.viewport,
                            cropAreaClassName: styles.cropArea,
                        }}
                        cropperProps={{
                            tabIndex: -DISABLED_TAB_INDEX,
                        }}
                        mediaProps={{
                            alt: t('image'),
                            onError: () => setError(true),
                        }}
                    />
                )}
                {ready && (
                    <CropSelection
                        region={region}
                        onChange={setRegion}
                        disabled={saving}
                        onZoom={(scale) => setZoom((value) => Math.max(ON_ZOOM_1, Math.min(ON_ZOOM_4, value * scale)))}
                    />
                )}
            </Box>
            {error && <Alert theme="danger" message={t('error')} className={styles.error} />}
            <Flex alignItems="center" className={styles.toolbar}>
                <Button
                    view="flat"
                    size="xl"
                    className={styles.cancel}
                    aria-label={t('cancel')}
                    onClick={onClose}
                    disabled={saving}
                >
                    <Box className={styles.cancelContent}>
                        <Text as="span" variant="body-2" className={styles.cancelLabel}>
                            {t('cancel')}
                        </Text>
                        <Icon data={Xmark} size={MEDIUM_ICON_SIZE} className={styles.cancelIcon} />
                    </Box>
                </Button>
                <Flex className={styles.functions}>
                    <Button
                        view="flat"
                        size="xl"
                        className={styles.tool}
                        aria-label={t('rotate')}
                        disabled={!ready || saving}
                        onClick={() => {
                            setArea(undefined);
                            setRotation((value) => (value + ON_CLICK_90) % ON_CLICK_360);
                            setCrop({ x: X_0, y: Y_0 });
                        }}
                    >
                        <Icon data={ArrowRotateRight} size={EDITOR_ICON_SIZE} />
                    </Button>
                    <Button
                        view="flat"
                        size="xl"
                        className={`${styles.tool} ${flipX ? styles.selected : ''}`}
                        aria-label={t('flipHorizontal')}
                        selected={flipX}
                        disabled={!ready || saving}
                        onClick={() => setFlipX(!flipX)}
                    >
                        <Icon data={ArrowsOppositeToDots} size={EDITOR_ICON_SIZE} />
                    </Button>
                    <Button
                        view="flat"
                        size="xl"
                        className={`${styles.tool} ${flipY ? styles.selected : ''}`}
                        aria-label={t('flipVertical')}
                        selected={flipY}
                        disabled={!ready || saving}
                        onClick={() => setFlipY(!flipY)}
                    >
                        <Icon data={ArrowsOppositeToDots} size={EDITOR_ICON_SIZE} className={styles.verticalIcon} />
                    </Button>
                </Flex>
                <Button
                    view="flat"
                    size="xl"
                    className={styles.apply}
                    onClick={save}
                    disabled={!ready || !area || saving}
                    aria-busy={saving}
                    aria-label={t(saving ? 'loading' : 'apply')}
                >
                    <Box className={styles.applyContent}>
                        <Text
                            as="span"
                            variant="body-2"
                            className={`${styles.applyLabel} ${saving ? styles.hidden : ''}`}
                        >
                            {t('apply')}
                        </Text>
                        {saving && (
                            <Flex
                                alignItems="center"
                                justifyContent="center"
                                className={styles.progress}
                                role="status"
                                aria-label={t('loading')}
                            >
                                <Spin size="s" className={styles.spinner} />
                            </Flex>
                        )}
                    </Box>
                </Button>
            </Flex>
        </Flex>
    );

    if (embedded) {
        return body;
    }

    return (
        <Modal
            open
            aria-label={t('title')}
            className={styles.modal}
            contentClassName={styles.content}
            onOpenChange={(open) => {
                if (!open && !saving) {
                    onClose();
                }
            }}
            onTransitionInComplete={() => setEntered(true)}
            disableOutsideClick={saving}
            disableEscapeKeyDown={saving}
        >
            {body}
        </Modal>
    );
}
