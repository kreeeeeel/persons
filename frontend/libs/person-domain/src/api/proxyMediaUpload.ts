import {
    request as httpRequest,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { request as httpsRequest } from "node:https";
import { Transform } from "node:stream";
import { finished } from "node:stream/promises";
import type { BffConfiguration } from "@persons/person-domain/api/server.types";
import { maxMediaUploadRequestBytes } from "@persons/person-domain/media/uploadLimits";

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const PERSON_ID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function proxyMediaUpload(
    request: IncomingMessage,
    response: ServerResponse,
    personId: unknown,
    config: BffConfiguration,
) {
    function reject(status: number, code: string) {
        response.writeHead(status, {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
        });
        response.end(JSON.stringify({ code }));
    }
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return reject(405, "INVALID_INPUT");
    }
    if (request.headers.origin !== new URL(config.publicUrl).origin) {
        return reject(403, "FORBIDDEN");
    }
    if (!config.sessionToken) {
        return reject(401, "UNAUTHORIZED");
    }
    if (typeof personId !== "string" || !PERSON_ID.test(personId)) {
        return reject(404, "CONTENT_NOT_FOUND");
    }
    const contentType = request.headers["content-type"] ?? "";
    const length = request.headers["content-length"];
    if (
        !/^multipart\/form-data\s*;.*\bboundary=.+/i.test(contentType) ||
        (length !== undefined && !/^\d+$/.test(length))
    ) {
        return reject(400, "INVALID_INPUT");
    }
    if (length !== undefined && Number(length) > maxMediaUploadRequestBytes) {
        return reject(413, "UPLOAD_TOO_LARGE");
    }

    // Keep the Node stream intact: the Web Request adapter can queue a large
    // upload before the storage service consumes it.
    const target = new URL(
        `${config.personUrl.replace(/\/+$/, "")}/v1/persons/${personId}/media`,
    );
    const controller = new AbortController();
    const abort = () => controller.abort();
    const closed = () => {
        if (!response.writableFinished) {
            abort();
        }
    };
    request.once("aborted", abort);
    request.once("error", abort);
    response.once("close", closed);
    let received = 0;
    let exceeded = false;
    const limiter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            received += chunk.length;
            if (received > maxMediaUploadRequestBytes) {
                exceeded = true;
                callback(new Error("UPLOAD_TOO_LARGE"));
            } else {
                callback(null, chunk);
            }
        },
    });
    try {
        await new Promise<void>((resolve) => {
            const upstream = (
                target.protocol === "https:" ? httpsRequest : httpRequest
            )(target, {
                method: "POST",
                signal: AbortSignal.any([
                    controller.signal,
                    AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
                ]),
                headers: {
                    "Content-Type": contentType,
                    ...(length !== undefined
                        ? { "Content-Length": length }
                        : {}),
                    Authorization: `Bearer ${config.sessionToken}`,
                    "X-Service-Authorization": `Bearer ${config.serviceToken}`,
                },
            });
            const stopUpload = () => {
                request.unpipe(limiter);
                limiter.unpipe(upstream);
                request.resume();
            };
            upstream.once("error", (error) => {
                stopUpload();
                if (
                    !controller.signal.aborted &&
                    !response.headersSent &&
                    !response.destroyed
                ) {
                    console.error("Media upload transport failed", {
                        cause: error.name,
                    });
                    reject(
                        exceeded ? 413 : 503,
                        exceeded ? "UPLOAD_TOO_LARGE" : "UNAVAILABLE",
                    );
                }
                resolve();
            });
            limiter.once("error", () =>
                upstream.destroy(new Error("UPLOAD_TOO_LARGE")),
            );
            upstream.once("response", async (result) => {
                stopUpload();
                const status = result.statusCode ?? 502;
                if (
                    (status >= 300 && status < 400) ||
                    status >= 500 ||
                    !result.headers["content-type"]?.includes("json")
                ) {
                    result.resume();
                    reject(
                        status >= 300 && status < 400 ? 502 : status,
                        status >= 300 ? "UNAVAILABLE" : "INVALID_INPUT",
                    );
                    resolve();
                    return;
                }
                response.writeHead(status, {
                    "Content-Type": "application/json",
                    "Cache-Control": "private, no-store",
                });
                const failResponse = (error: Error) => response.destroy(error);
                result.once("error", failResponse);
                try {
                    result.pipe(response);
                    await finished(response, { cleanup: true });
                } catch (error) {
                    if (!controller.signal.aborted) {
                        console.error("Media upload response failed", {
                            cause:
                                error instanceof Error ? error.name : "Unknown",
                        });
                    }
                } finally {
                    result.removeListener("error", failResponse);
                    resolve();
                }
            });
            request.pipe(limiter).pipe(upstream);
        });
    } finally {
        request.removeListener("aborted", abort);
        request.removeListener("error", abort);
        response.removeListener("close", closed);
        limiter.destroy();
    }
}
