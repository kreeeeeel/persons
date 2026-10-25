export interface PlaybackPreferences {
    readonly autoplay: boolean;
    readonly muted: boolean;
    readonly quality: 'original' | '1080' | '720' | '480' | '360';
    readonly speed: number;
    readonly volume: number;
}
