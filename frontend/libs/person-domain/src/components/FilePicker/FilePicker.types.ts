export interface FilePickerProps {
    readonly accept: string;
    readonly label: string;
    readonly file?: File;
    readonly disabled?: boolean;
    readonly onChange: (file?: File) => void;
}
