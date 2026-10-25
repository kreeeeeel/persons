import { isQuickTimeFile } from "@persons/person-domain/media/videoFiles";

const PREVIEW_MAX_WIDTH = 960;
const PREVIEW_MAX_HEIGHT = 540;
const PREPARATION_TIMEOUT_MS = 15000;
const MAX_DURATION_SECONDS = 86400;

export async function prepareVideo(
    file: File,
    signal?: AbortSignal,
): Promise<{ durationSeconds: number; preview?: Blob } | undefined> {
    signal?.throwIfAborted();
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    let abort: (() => void) | undefined;
    try {
        return await new Promise((resolve, reject) => {
            const fail = () => {
                clearTimeout(timer);
                reject(new Error("INVALID_MEDIA"));
            };
            // Some MOV codecs cannot be decoded by the browser. The server still validates
            // and transcodes the original; a missing client-side preview must not block it.
            const unsupported = () => {
                clearTimeout(timer);
                if (isQuickTimeFile(file)) {
                    resolve(undefined);
                } else {
                    fail();
                }
            };
            const timer = setTimeout(unsupported, PREPARATION_TIMEOUT_MS);
            abort = () => {
                clearTimeout(timer);
                reject(new DOMException("Upload cancelled", "AbortError"));
            };
            signal?.addEventListener("abort", abort, { once: true });
            video.onerror = unsupported;
            video.onloadedmetadata = () => {
                if (!Number.isFinite(video.duration) || video.duration <= 0) {
                    unsupported();
                    return;
                }
                if (video.duration > MAX_DURATION_SECONDS) {
                    fail();
                    return;
                }
                video.currentTime = Math.min(0.1, video.duration / 2);
            };
            video.onseeked = () => {
                const scale = Math.min(
                    1,
                    PREVIEW_MAX_WIDTH / video.videoWidth,
                    PREVIEW_MAX_HEIGHT / video.videoHeight,
                );
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(
                    1,
                    Math.round(video.videoWidth * scale),
                );
                canvas.height = Math.max(
                    1,
                    Math.round(video.videoHeight * scale),
                );
                const context = canvas.getContext("2d");
                if (!context || !video.videoWidth || !video.videoHeight) {
                    unsupported();
                    return;
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (preview) => {
                        clearTimeout(timer);
                        if (preview) {
                            resolve({
                                durationSeconds: video.duration,
                                preview,
                            });
                        } else {
                            unsupported();
                        }
                    },
                    "image/jpeg",
                    0.85,
                );
            };
            video.src = url;
        });
    } finally {
        if (abort) {
            signal?.removeEventListener("abort", abort);
        }
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
    }
}
