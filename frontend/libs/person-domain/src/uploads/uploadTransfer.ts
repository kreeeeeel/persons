import {
    ModerationReceiptFromJSON,
    ResponseError,
} from "@persons/person-client";
import { personError } from "@persons/person-domain/api/browser";
import { notifyRestriction } from "@persons/person-domain/restrictions/notice";
import { prepareVideo } from "@persons/person-domain/media/prepareVideo";
import type { UploadTransfer } from "@persons/person-domain/uploads/UploadQueue.types";

const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

export const uploadTransfer: UploadTransfer = async (input, signal, update) => {
    update(0, "PREPARING");
    const video =
        input.kind === "MOMENT"
            ? await prepareVideo(input.file, signal)
            : undefined;
    signal.throwIfAborted();
    const form = new FormData();
    form.append("file", input.file);
    form.append("kind", input.kind);
    form.append("caption", input.caption);
    input.taggedPersonIds.forEach((id) => form.append("taggedPersonIds", id));
    if (video) {
        form.append("durationSeconds", String(video.durationSeconds));
        if (video.preview) {
            form.append("preview", video.preview, "preview.jpg");
        }
    }
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const abort = () => request.abort();
        const finish = () => signal.removeEventListener("abort", abort);
        request.open("POST", `/api/person/v1/persons/${input.personId}/media`);
        request.timeout = UPLOAD_TIMEOUT_MS;
        request.withCredentials = true;
        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                update(
                    Math.min(
                        99,
                        Math.round((event.loaded / event.total) * 100),
                    ),
                    "UPLOADING",
                );
            }
        };
        request.upload.onload = () => update(99, "PROCESSING");
        request.onload = () => {
            finish();
            let body: unknown;
            try {
                body = JSON.parse(request.responseText);
            } catch {
                reject(new Error("UNAVAILABLE"));
                return;
            }
            if (request.status >= 200 && request.status < 300) {
                resolve(ModerationReceiptFromJSON(body));
            } else {
                const response = Response.json(body, {
                    status: request.status,
                });
                void notifyRestriction(response)
                    .then(() => personError(new ResponseError(response)))
                    .then(
                        (code) => reject(new Error(code)),
                        () => reject(new Error("UNAVAILABLE")),
                    );
            }
        };
        request.onerror = request.ontimeout = () => {
            finish();
            reject(new Error("UNAVAILABLE"));
        };
        request.onabort = () => {
            finish();
            reject(new DOMException("Upload cancelled", "AbortError"));
        };
        signal.addEventListener("abort", abort, { once: true });
        update(0, "UPLOADING");
        request.send(form);
        if (signal.aborted) {
            request.abort();
        }
    });
};
