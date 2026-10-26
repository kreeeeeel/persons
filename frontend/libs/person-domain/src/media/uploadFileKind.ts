import { isVideoFile } from "@persons/person-domain/media/videoFiles";

export function uploadFileKind(file: File): "PHOTO" | "MOMENT" | undefined {
    if (["image/jpeg", "image/png"].includes(file.type)) {
        return "PHOTO";
    }
    return isVideoFile(file) ? "MOMENT" : undefined;
}
