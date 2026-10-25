export interface LoadedImageProps {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
    readonly className?: string;
    readonly responsive?: boolean;
    readonly objectFit?: 'contain' | 'cover';
    readonly loading?: 'eager' | 'lazy';
}
