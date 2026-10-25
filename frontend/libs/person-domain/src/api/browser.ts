"use client";

import { Configuration, ResponseError } from "@persons/person-client";
import { notifyRestriction } from "@persons/person-domain/restrictions/notice";
import { createPersonClients } from "@persons/person-domain/api/clients";

export const personClient = createPersonClients(
    new Configuration({
        basePath: "/api/person",
        fetchApi: async (input, init) => {
            const response = await fetch(input, init);
            await notifyRestriction(response);
            return response;
        },
    }),
);

export async function personError(error: unknown): Promise<string> {
    if (error instanceof ResponseError) {
        const body: unknown = await error.response.json().catch(() => null);

        if (
            body &&
            typeof body === "object" &&
            "code" in body &&
            typeof body.code === "string"
        ) {
            const codes: Record<string, string> = {
                INVALID_INPUT: "INVALID_INPUT",
                UNAUTHORIZED: "UNAUTHORIZED",
                FORBIDDEN: "FORBIDDEN",
                ACTION_RESTRICTED: "ACTION_RESTRICTED",
                PAGE_ACTION_RESTRICTED: "PAGE_ACTION_RESTRICTED",
                PERSON_NOT_FOUND: "NOT_FOUND",
                CONTENT_NOT_FOUND: "NOT_FOUND",
                SLUG_TAKEN: "CONFLICT",
                CONFLICT: "CONFLICT",
                PENDING_CHANGE: "CONFLICT",
                TOO_MANY_PENDING: "RATE_LIMITED",
                UPLOAD_TOO_LARGE: "MEDIA_TOO_LARGE",
                UNSUPPORTED_MEDIA: "INVALID_MEDIA",
                STORAGE_UNAVAILABLE: "UNAVAILABLE",
                UNAVAILABLE: "UNAVAILABLE",
            };

            return codes[body.code] ?? "UNAVAILABLE";
        }
    }

    return "UNAVAILABLE";
}

export function mediaHref(id: string): string {
    return `/api/person/v1/media/${encodeURIComponent(id)}/content`;
}
