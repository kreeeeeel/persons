import type { PersonSummary } from "@persons/person-client";

export interface UploadDraft {
    readonly kind: "PHOTO" | "MOMENT";
    readonly file: File;
    readonly url: string;
    readonly caption: string;
    readonly people: PersonSummary[];
}
