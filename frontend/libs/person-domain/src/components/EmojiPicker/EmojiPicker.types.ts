export interface EmojiPickerProps {
    readonly value: string;
    readonly emojis: readonly string[];
    readonly disabled?: boolean;
    readonly onChange: (emoji: string) => void;
}
