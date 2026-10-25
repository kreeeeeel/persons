import {
    Configuration,
    DynamicPropertiesApi,
    DynamicPropertyFromJSON,
} from "@persons/dynamic-properties-client";
import type {
    DynamicProperty,
    DynClientOptions,
} from "@persons/dynamic-properties/types";

export class DynPropertyClient {
    private started?: Promise<void>;
    private stream?: EventSource;
    private readonly api: DynamicPropertiesApi;
    private readonly listeners = new Set<() => void>();
    private readonly initial = new Map<string, unknown>();
    private controller?: AbortController;
    private state: { ready: boolean; error?: Error } = { ready: false };

    constructor(readonly options: DynClientOptions) {
        this.api = new DynamicPropertiesApi(
            new Configuration({
                basePath: options.url,
                credentials: "same-origin",
            }),
        );
        options.properties.forEach((property) =>
            this.initial.set(
                property.definition.key,
                property.readSnapshot(
                    options.initialValues?.find(
                        (record) => record.key === property.definition.key,
                    ),
                ),
            ),
        );
        if (options.initialValues) {
            this.apply(options.initialValues);
            this.state = { ready: true };
        }
    }

    readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    readonly snapshot = () => this.state;
    serverValue<T>(
        property: import("@persons/dynamic-properties/DynProperty").DynProperty<T>,
    ): T {
        return this.initial.has(property.definition.key)
            ? (this.initial.get(property.definition.key) as T)
            : property.defaultValue;
    }

    start(): Promise<void> {
        if (!this.started) {
            this.started = this.bootstrap();
        }
        return this.started;
    }

    private async bootstrap(): Promise<void> {
        const controller = new AbortController();
        this.controller = controller;
        try {
            const values = await this.api.getPublicProperties({
                signal: controller.signal,
            });
            if (controller.signal.aborted) {
                return;
            }
            this.apply(values);
            this.state = { ready: true };
            this.emit();
            this.stream = new EventSource(
                `${this.options.url}/v1/dynamic-properties/events`,
            );
            this.stream.onmessage = (event: MessageEvent<string>) => {
                try {
                    const input: unknown = JSON.parse(event.data);
                    if (!Array.isArray(input)) {
                        throw new Error("Invalid dynamic property snapshot");
                    }
                    this.apply(
                        input.map((record: unknown) =>
                            DynamicPropertyFromJSON(record),
                        ),
                    );
                    this.state = { ready: true };
                    this.emit();
                } catch (error) {
                    this.fail(error);
                }
            };
            this.stream.onerror = () => {
                // EventSource reconnects automatically; the server sends a fresh snapshot on each connection.
                this.state = {
                    ...this.state,
                    error: new Error("Dynamic property updates disconnected"),
                };
                this.emit();
            };
        } catch (error) {
            if (!controller.signal.aborted) {
                this.started = undefined;
                this.fail(error);
            }
        }
    }

    apply(values: readonly DynamicProperty[]): void {
        for (const property of this.options.properties) {
            const record = values.find(
                (item) => item.key === property.definition.key,
            );
            if (record) {
                property.apply(record);
            } else {
                property.reset();
            }
        }
    }

    close(): void {
        this.controller?.abort();
        this.stream?.close();
        this.stream = undefined;
        this.started = undefined;
    }

    private fail(error: unknown): void {
        this.state = {
            ...this.state,
            error:
                error instanceof Error
                    ? error
                    : new Error("Dynamic properties unavailable"),
        };
        this.emit();
    }

    private emit(): void {
        this.listeners.forEach((listener) => listener());
    }
}
