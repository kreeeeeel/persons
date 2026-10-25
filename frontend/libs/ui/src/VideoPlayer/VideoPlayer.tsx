'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Flex, Icon, Slider, Text } from '@gravity-ui/uikit';
import { Pause, Play, PlayFill, Volume, VolumeLow, VolumeXmark } from '@gravity-ui/icons';
import { FullscreenIcon } from '@persons/ui/VideoPlayer/FullscreenIcon';
import { BrandLoader } from '@persons/ui/BrandLoader';
import { PlayerSettings } from '@persons/ui/VideoPlayer/components/PlayerSettings/PlayerSettings';
import { usePlaybackPreferences } from '@persons/ui/VideoPlayer/usePlaybackPreferences';
import { preferredVideoSource } from '@persons/ui/VideoPlayer/playbackPreferences';
import type { VideoPlayerProps } from '@persons/ui/VideoPlayer/VideoPlayer.types';
import styles from '@persons/ui/VideoPlayer/VideoPlayer.module.css';

const SEEK_STEP_SECONDS = 5;
const VOLUME_SCALE = 100;
const LOW_VOLUME_THRESHOLD = 50;

function timestamp(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function VideoPlayer({
    src,
    title,
    poster,
    labels,
    sources = [],
    qualityNotice,
    processing = false,
    onQualityRetry,
}: VideoPlayerProps) {
    const { preferences } = usePlaybackPreferences();
    const root = useRef<HTMLDivElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [failedSource, setFailedSource] = useState<string>();
    const [unplayable, setUnplayable] = useState<readonly string[]>([]);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volumeOverride, setVolume] = useState<number>();
    const volume = volumeOverride ?? preferences.volume;
    const [mutedOverride, setMuted] = useState<boolean>();
    const muted = mutedOverride ?? preferences.muted;
    const audibleVolume = useRef(preferences.volume || 50);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenFailed, setFullscreenFailed] = useState(false);
    const [speedOverride, setSpeed] = useState<number>();
    const speed = speedOverride ?? preferences.speed;
    const [quality, setQuality] = useState<string>();
    const resume = useRef<{ position: number; playing: boolean } | undefined>(undefined);
    const qualities = [{ src, label: labels.original ?? 'Original' }, ...sources];
    const preferred = preferredVideoSource(src, sources, preferences.quality);
    const requestedSource = quality && qualities.some((source) => source.src === quality) ? quality : preferred;
    const selectedSource = unplayable.includes(requestedSource)
        ? (sources.find((source) => !unplayable.includes(source.src))?.src ?? sources.at(-1)?.src ?? requestedSource)
        : requestedSource;
    const failed = failedSource === selectedSource || unplayable.includes(selectedSource);
    const previousSource = useRef(selectedSource);
    const previousOriginal = useRef(src);
    const playback = useRef({ position: 0, playing: false });
    const silent = muted || volume === 0;
    const volumeIcon = silent ? VolumeXmark : volume <= LOW_VOLUME_THRESHOLD ? VolumeLow : Volume;

    useEffect(() => {
        if (previousSource.current !== selectedSource) {
            if (previousOriginal.current === src) {
                resume.current ??= { ...playback.current };
            } else {
                resume.current = undefined;
                playback.current = { position: 0, playing: false };
            }
            previousSource.current = selectedSource;
            previousOriginal.current = src;
        }
    }, [selectedSource, src]);

    useEffect(() => {
        if (video.current) {
            video.current.playbackRate = speed;
        }
    }, [speed]);

    useEffect(() => {
        if (video.current) {
            video.current.volume = preferences.volume / VOLUME_SCALE;
        }
    }, [preferences.volume]);

    useEffect(() => {
        const update = () => setFullscreen(document.fullscreenElement === root.current);
        document.addEventListener('fullscreenchange', update);

        return () => document.removeEventListener('fullscreenchange', update);
    }, []);

    async function toggle() {
        const element = video.current;

        if (!element || failed) {
            return;
        }

        if (element.paused) {
            try {
                await element.play();
            } catch {
                setFailedSource(selectedSource);
            }
        } else {
            element.pause();
        }
    }

    function seek(value: number) {
        if (video.current && loaded) {
            const next = Math.min(duration, Math.max(0, value));
            video.current.currentTime = next;
            setPosition(next);
        }
    }

    async function toggleFullscreen() {
        setFullscreenFailed(false);
        try {
            if (document.fullscreenElement === root.current) {
                await document.exitFullscreen();
            } else if (root.current?.requestFullscreen) {
                await root.current.requestFullscreen();
            } else {
                setFullscreenFailed(true);
            }
        } catch {
            setFullscreenFailed(true);
        }
    }

    return (
        <Box className={styles.player} ref={root} role="group" aria-label={title}>
            <Box className={styles.screen}>
                <Box
                    as="video"
                    ref={video}
                    src={selectedSource}
                    poster={poster}
                    preload="metadata"
                    autoPlay={preferences.autoplay}
                    muted={muted}
                    playsInline
                    tabIndex={0}
                    aria-label={title}
                    className={styles.video}
                    onClick={toggle}
                    onPlay={() => {
                        playback.current.playing = true;
                        setPlaying(true);
                    }}
                    onPause={() => {
                        playback.current.playing = false;
                        setPlaying(false);
                    }}
                    onEnded={() => setPlaying(false)}
                    onTimeUpdate={() => {
                        const current = video.current?.currentTime ?? 0;
                        playback.current.position = current;
                        setPosition(current);
                    }}
                    onVolumeChange={() => {
                        if (video.current) {
                            const value = Math.round(video.current.volume * VOLUME_SCALE);
                            setVolume(value);
                            setMuted(video.current.muted);
                            if (value > 0) {
                                audibleVolume.current = value;
                            }
                        }
                    }}
                    onLoadedMetadata={() => {
                        const seconds = video.current?.duration ?? 0;
                        setDuration(Number.isFinite(seconds) ? seconds : 0);
                        setLoaded(true);
                        if (video.current) {
                            video.current.playbackRate = speed;
                            if (resume.current) {
                                video.current.currentTime = Math.min(
                                    resume.current.position,
                                    Number.isFinite(seconds) ? seconds : resume.current.position,
                                );
                                if (resume.current.playing) {
                                    void video.current.play().catch(() => setFailedSource(selectedSource));
                                }
                                resume.current = undefined;
                            }
                        }
                    }}
                    onLoadStart={() => {
                        setLoaded(false);
                        setFailedSource(undefined);
                        setBuffering(true);
                    }}
                    onDurationChange={() => {
                        const seconds = video.current?.duration ?? 0;
                        setDuration(Number.isFinite(seconds) ? seconds : 0);
                    }}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => setBuffering(false)}
                    onCanPlay={() => setBuffering(false)}
                    onError={() => {
                        setUnplayable((values) =>
                            values.includes(selectedSource) ? values : [...values, selectedSource],
                        );
                        setFailedSource(selectedSource);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === ' ') {
                            event.preventDefault();
                            void toggle();
                        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                            event.preventDefault();
                            seek(position + (event.key === 'ArrowRight' ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS));
                        }
                    }}
                />
                {(((!loaded || buffering) && !failed) || (failed && processing)) && (
                    <Flex className={styles.loading} alignItems="center" justifyContent="center">
                        <Flex direction="column" alignItems="center" gap="3">
                            <BrandLoader
                                label={failed && processing ? (qualityNotice ?? labels.loading) : labels.loading}
                                size={56}
                            />
                            {failed && processing && qualityNotice && <Text>{qualityNotice}</Text>}
                        </Flex>
                    </Flex>
                )}
                {!playing && loaded && !buffering && !failed && (
                    <Box
                        as="button"
                        type="button"
                        className={styles.centerPlay}
                        aria-label={labels.play}
                        onClick={toggle}
                    >
                        <Icon data={PlayFill} size={28} />
                    </Box>
                )}
                {failed && !processing && (
                    <Flex
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        gap="3"
                        className={styles.failure}
                        role="alert"
                    >
                        <Text>{labels.error}</Text>
                        <Button
                            size="l"
                            onClick={() => {
                                setUnplayable([]);
                                setFailedSource(undefined);
                                setLoaded(false);
                                video.current?.load();
                            }}
                        >
                            {labels.retry}
                        </Button>
                    </Flex>
                )}
            </Box>
            <Flex direction="column" className={styles.controls}>
                <Box className={styles.timeline}>
                    <Slider
                        value={position}
                        min={0}
                        max={duration || 1}
                        marks={0}
                        step={0.1}
                        disabled={!loaded || !duration || failed}
                        onUpdate={seek}
                        aria-label={labels.seek}
                        tooltipFormat={timestamp}
                        tooltipDisplay="off"
                        size="s"
                    />
                </Box>
                <Flex alignItems="center" className={styles.toolbar}>
                    <Button
                        view="flat"
                        size="l"
                        className={styles.controlButton}
                        onClick={toggle}
                        disabled={!loaded || failed}
                        aria-label={playing ? labels.pause : labels.play}
                    >
                        <Icon data={playing ? Pause : Play} size={20} />
                    </Button>
                    <Text
                        className={styles.time}
                        style={{ width: `${Math.max(4, timestamp(duration).length) * 2 + 1}ch` }}
                    >
                        {timestamp(position)} / {duration ? timestamp(duration) : '—'}
                    </Text>
                    <Button
                        view="flat"
                        size="l"
                        aria-label={silent ? labels.unmute : labels.mute}
                        className={styles.controlButton}
                        onClick={() => {
                            if (video.current) {
                                if (silent) {
                                    const restored = volume || audibleVolume.current;
                                    video.current.volume = restored / VOLUME_SCALE;
                                    setVolume(restored);
                                }
                                video.current.muted = !silent;
                                setMuted(!silent);
                            }
                        }}
                    >
                        <Icon data={volumeIcon} size={20} />
                    </Button>
                    <Box className={styles.volume}>
                        <Slider
                            value={muted ? 0 : volume}
                            min={0}
                            max={VOLUME_SCALE}
                            marks={0}
                            onUpdate={(value) => {
                                if (value > 0) {
                                    audibleVolume.current = value;
                                }
                                setVolume(value);
                                setMuted(value === 0);

                                if (video.current) {
                                    video.current.volume = value / VOLUME_SCALE;
                                    video.current.muted = value === 0;
                                }
                            }}
                            aria-label={labels.volume}
                            size="s"
                            tooltipDisplay="off"
                        />
                    </Box>
                    <Box className={styles.spacer} />
                    <Flex alignItems="center" className={styles.settingsControls}>
                        <PlayerSettings
                            notice={qualityNotice}
                            onRetry={onQualityRetry}
                            labels={labels}
                            speed={speed}
                            quality={selectedSource}
                            sources={qualities}
                            onSpeed={(value) => {
                                setSpeed(value);
                                if (video.current) {
                                    video.current.playbackRate = value;
                                }
                            }}
                            onQuality={(value) => {
                                if (value !== selectedSource) {
                                    resume.current = { position: video.current?.currentTime ?? position, playing };
                                    setQuality(value);
                                }
                            }}
                        />
                        <Button
                            view="flat"
                            size="l"
                            className={styles.fullscreenButton}
                            aria-label={fullscreen ? labels.exitFullscreen : labels.fullscreen}
                            title={fullscreen ? labels.exitFullscreen : labels.fullscreen}
                            onClick={() => void toggleFullscreen()}
                        >
                            <FullscreenIcon active={fullscreen} />
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
            {fullscreenFailed && (
                <Text as="p" role="status" className={styles.fullscreenNotice}>
                    {labels.fullscreenError}
                </Text>
            )}
        </Box>
    );
}
