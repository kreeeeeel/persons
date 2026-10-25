const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
export const videoUploadAccept =
    "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

export function isQuickTimeFile(file: File): boolean {
    return file.type === "video/quicktime" || /\.mov$/i.test(file.name);
}

export function isVideoFile(file: File): boolean {
    return VIDEO_TYPES.has(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
}
