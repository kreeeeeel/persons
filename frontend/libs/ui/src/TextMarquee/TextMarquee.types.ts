export interface TextMarqueeProps {
    readonly items: readonly string[];
    readonly label?: string;
    readonly loading?: boolean;
    readonly className?: string;
    readonly view?: 'brand' | 'glass';
}
