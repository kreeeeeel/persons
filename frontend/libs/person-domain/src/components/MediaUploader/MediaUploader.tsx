"use client";

import { PersonAvatarUploader } from "@persons/person-domain/PersonAvatarUploader";
import { MediaFilesUploader } from "@persons/person-domain/MediaFilesUploader";
import type { MediaUploaderProps } from "@persons/person-domain/MediaUploader/MediaUploader.types";

export function MediaUploader(props: MediaUploaderProps) {
    return props.kind === "AVATAR" ? (
        <PersonAvatarUploader {...props} />
    ) : (
        <MediaFilesUploader {...props} kind={props.kind} />
    );
}
