import type { VideoQuality } from '@persons/ui/VideoPlayer/VideoQuality';

export interface VideoPlayerProps {
    readonly src: string;
    readonly title: string;
    readonly poster?: string;
    readonly sources?: readonly VideoQuality[];
    readonly qualityNotice?: string;
    readonly processing?: boolean;
    readonly onQualityRetry?: () => void;
    readonly labels: {
        readonly play: string;
        readonly pause: string;
        readonly mute: string;
        readonly unmute: string;
        readonly seek: string;
        readonly volume: string;
        readonly fullscreen: string;
        readonly fullscreenError: string;
        readonly exitFullscreen: string;
        readonly error: string;
        readonly retry: string;
        readonly loading: string;
        readonly settings?: string;
        readonly speed?: string;
        readonly quality?: string;
        readonly original?: string;
    };
}
