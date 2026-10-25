"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let current: number | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

function update() {
    current = Date.now();
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!timer) {
        update();
        timer = setInterval(update, 30_000);
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

export function useContentClock() {
    return useSyncExternalStore(
        subscribe,
        () => current,
        () => undefined,
    );
}
