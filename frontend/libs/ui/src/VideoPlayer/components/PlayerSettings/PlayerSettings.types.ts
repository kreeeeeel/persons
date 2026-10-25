import type { VideoPlayerProps } from '@persons/ui/VideoPlayer/VideoPlayer.types';
import type { VideoQuality } from '@persons/ui/VideoPlayer/VideoQuality';

export interface PlayerSettingsProps {
    readonly notice?: string;
    readonly onRetry?: () => void;
    readonly labels: VideoPlayerProps['labels'];
    readonly speed: number;
    readonly quality: string;
    readonly sources: readonly VideoQuality[];
    readonly onSpeed: (value: number) => void;
    readonly onQuality: (value: string) => void;
}
