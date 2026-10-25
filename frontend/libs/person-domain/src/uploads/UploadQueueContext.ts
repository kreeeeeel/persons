"use client";

import { createContext, useContext } from "react";
import type { UploadQueue } from "@persons/person-domain/uploads/UploadQueue";

export const UploadQueueContext = createContext<UploadQueue | undefined>(
    undefined,
);

export function useUploadQueue() {
    const queue = useContext(UploadQueueContext);
    if (!queue) {
        throw new Error("UploadQueueProvider is required");
    }
    return queue;
}
