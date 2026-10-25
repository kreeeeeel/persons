export interface FileDropDialogProps {
    readonly title: string;
    readonly description: string;
    readonly chooseLabel: string;
    readonly hint: string;
    readonly illustration: string;
    readonly illustrationAlt: string;
    readonly accept: string;
    readonly error?: string;
    readonly multiple?: boolean;
    readonly onSelect: (files: File[]) => void;
    readonly onClose: () => void;
}
