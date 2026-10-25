export interface CredentialsFormProps {
    readonly pending: boolean;
    readonly recovery?: boolean;
    readonly returnTo?: string;
    readonly onSubmit: (email: string, password: string) => void;
    readonly onForgot: () => void;
    readonly onRegister: () => void;
    readonly onBack: () => void;
}
