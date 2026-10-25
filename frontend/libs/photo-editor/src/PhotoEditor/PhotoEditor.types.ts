export interface PhotoEditorProps {
    readonly embedded?: boolean;
    readonly source: string;
    readonly onSave: (image: string) => void;
    readonly onClose: () => void;
}
