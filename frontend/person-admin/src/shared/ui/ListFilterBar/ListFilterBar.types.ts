export interface ListFilterField {
    readonly key: string;
    readonly label: string;
    readonly type?: 'date' | 'person' | 'user';
    readonly options?: { value: string; content: string }[];
    readonly value: string;
    readonly valueLabel?: string;
    readonly min?: string;
    readonly max?: string;
    readonly defaultValue?: string;
    readonly onChange: (value: string, label?: string) => void;
}
