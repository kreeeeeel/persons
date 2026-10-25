"use client";

import { RestrictionErrorResponseFromJSON } from "@persons/person-client";

export const RESTRICTION_EVENT = "persons:action-restricted";

export async function notifyRestriction(response: Response): Promise<void> {
    if (response.status !== 403 || typeof window === "undefined") {
        return;
    }
    const body: unknown = await response
        .clone()
        .json()
        .catch(() => null);
    if (
        typeof body === "object" &&
        body !== null &&
        "code" in body &&
        body.code === "ACTION_RESTRICTED" &&
        "restriction" in body &&
        body.restriction &&
        "scope" in body
    ) {
        window.dispatchEvent(
            new CustomEvent(RESTRICTION_EVENT, {
                detail: RestrictionErrorResponseFromJSON(body),
            }),
        );
    }
}
