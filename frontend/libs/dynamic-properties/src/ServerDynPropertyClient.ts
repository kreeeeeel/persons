import "server-only";

import {
    Configuration,
    DynamicPropertiesApi,
    DynamicPropertyFromJSON,
} from "@persons/dynamic-properties-client";
import type {
    DynamicProperty,
    DynDefinitionInput,
} from "@persons/dynamic-properties/types";

export class ServerDynPropertyClient {
    private initial?: Promise<void>;
    private values: readonly DynamicProperty[] = [];
    private readonly controller = new AbortController();

    constructor(
        private readonly options: {
            readonly url: string;
            readonly scope: string;
            readonly definitions: readonly DynDefinitionInput[];
            readonly serviceToken: () => string;
        },
    ) {}

    readonly snapshot = () => this.values;

    initialize(): Promise<void> {
        if (!this.initial) {
            this.initial = this.bootstrap().catch((error: unknown) => {
                this.initial = undefined;
                throw error;
            });
        }
        return this.initial;
    }

    private async bootstrap(): Promise<void> {
        const api = new DynamicPropertiesApi(
            new Configuration({
                basePath: this.options.url,
                headers: {
                    "X-Service-Authorization": `Bearer ${this.options.serviceToken()}`,
                },
            }),
        );
        this.values = await api.registerFrontendProperties({
            scope: this.options.scope,
            dynDefinitionInput: [...this.options.definitions],
        });
        void this.listen();
    }

    private async listen(): Promise<void> {
        try {
            const response = await fetch(
                `${this.options.url}/v1/dynamic-properties/events`,
                {
                    headers: {
                        "X-Service-Authorization": `Bearer ${this.options.serviceToken()}`,
                    },
                    cache: "no-store",
                    signal: this.controller.signal,
                },
            );
            if (!response.ok || !response.body) {
                throw new Error("Dynamic property event stream unavailable");
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let pending = "";
            try {
                while (!this.controller.signal.aborted) {
                    const chunk = await reader.read();
                    if (chunk.done) {
                        break;
                    }
                    pending += decoder
                        .decode(chunk.value, { stream: true })
                        .replaceAll("\r\n", "\n");
                    let boundary = pending.indexOf("\n\n");
                    while (boundary !== -1) {
                        const frame = pending.slice(0, boundary);
                        pending = pending.slice(boundary + 2);
                        const data = frame
                            .split("\n")
                            .filter((line) => line.startsWith("data:"))
                            .map((line) => line.slice(5).trimStart())
                            .join("\n");
                        if (data) {
                            const value: unknown = JSON.parse(data);
                            if (!Array.isArray(value)) {
                                throw new Error(
                                    "Invalid dynamic property event",
                                );
                            }
                            this.values = value.map((item: unknown) =>
                                DynamicPropertyFromJSON(item),
                            );
                        }
                        boundary = pending.indexOf("\n\n");
                    }
                    if (pending.length > 1048576) {
                        throw new Error("Dynamic property event is too large");
                    }
                }
            } finally {
                await reader.cancel();
            }
        } catch (error) {
            if (!this.controller.signal.aborted) {
                console.error("Dynamic property stream disconnected", {
                    cause: error instanceof Error ? error.name : "Unknown",
                });
            }
        }
        if (!this.controller.signal.aborted) {
            const retry = setTimeout(() => void this.listen(), 5000);
            retry.unref();
        }
    }

    close(): void {
        this.controller.abort();
    }
}
