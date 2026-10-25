"use client";

import { useState, useTransition } from "react";
import { personError } from "@persons/person-domain/api/browser";

export function usePersonMutation(
    resolveError: (error: unknown) => Promise<string> = personError,
) {
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState(false);
    const [published, setPublished] = useState(false);
    const [pending, startTransition] = useTransition();

    function notify(result?: unknown) {
        const approved =
            result !== null &&
            typeof result === "object" &&
            "status" in result &&
            result.status === "APPROVED";
        setNotice(!approved);
        setPublished(approved);
    }

    function run<T>(
        action: () => Promise<T>,
        onSuccess?: (result: T) => void,
        moderated = true,
    ) {
        setError(undefined);
        setNotice(false);
        setPublished(false);
        startTransition(async () => {
            try {
                const result = await action();
                const approved =
                    result !== null &&
                    typeof result === "object" &&
                    "status" in result &&
                    result.status === "APPROVED";
                setNotice(moderated && !approved);
                setPublished(moderated && approved);
                onSuccess?.(result);
            } catch (failure) {
                setError(await resolveError(failure));
            }
        });
    }

    return {
        error,
        notice,
        published,
        pending,
        run,
        notify,
    };
}
