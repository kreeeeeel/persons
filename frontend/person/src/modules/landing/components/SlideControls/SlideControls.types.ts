export interface SlideControlsProps {
    readonly index: number;
    readonly total: number;
    readonly paused: boolean;
    readonly allowAutoplay: boolean;
    readonly running: boolean;
    readonly duration: number;
    readonly onSelect: (index: number) => void;
    readonly onToggle: () => void;
}
