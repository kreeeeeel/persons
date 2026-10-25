import type { MediaKind, ModerationReceipt } from "@persons/person-client";

export type UploadStatus =
    | "QUEUED"
    | "PREPARING"
    | "UPLOADING"
    | "PROCESSING"
    | "DONE"
    | "ERROR"
    | "CANCELLED";

export interface UploadInput {
    readonly personId: string;
    readonly kind: Exclude<MediaKind, "AVATAR">;
    readonly file: File;
    readonly caption: string;
    readonly taggedPersonIds: string[];
}

export interface UploadTask {
    readonly id: string;
    readonly personId: string;
    readonly filename: string;
    readonly kind: UploadInput["kind"];
    readonly status: UploadStatus;
    readonly progress: number;
    readonly error?: string;
    readonly receipt?: ModerationReceipt;
}

export type UploadTransfer = (
    input: UploadInput,
    signal: AbortSignal,
    update: (progress: number, status: UploadStatus) => void,
) => Promise<ModerationReceipt>;
