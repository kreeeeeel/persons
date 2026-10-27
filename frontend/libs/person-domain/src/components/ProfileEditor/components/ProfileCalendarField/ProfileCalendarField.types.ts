export interface ProfileCalendarFieldProps {
    readonly label: string;
    readonly value?: Date;
    readonly disabled: boolean;
    readonly onChange: (value: Date | undefined) => void;
}
