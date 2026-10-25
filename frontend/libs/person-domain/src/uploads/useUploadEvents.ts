"use client";

import { useEffect, useEffectEvent } from "react";
import type { ModerationReceipt } from "@persons/person-client";
import { UPLOAD_COMPLETED_EVENT } from "@persons/person-domain/uploads/UploadQueue";

export function useUploadEvents(
    personId: string | undefined,
    onSaved: (receipt: ModerationReceipt) => void,
) {
    const saved = useEffectEvent(onSaved);
    useEffect(() => {
        const listener = (event: Event) => {
            const detail = (
                event as CustomEvent<{
                    personId: string;
                    receipt: ModerationReceipt;
                }>
            ).detail;
            if (!personId || detail.personId === personId) {
                saved(detail.receipt);
            }
        };
        window.addEventListener(UPLOAD_COMPLETED_EVENT, listener);
        return () =>
            window.removeEventListener(UPLOAD_COMPLETED_EVENT, listener);
    }, [personId]);
}
