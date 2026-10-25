import type {
    DynamicProperty,
    DynPropertySpec,
} from "@persons/dynamic-properties/types";

export class DynProperty<T> {
    private current: T;
    private revision = -1;
    private readonly listeners = new Set<() => void>();

    constructor(
        readonly definition: DynPropertySpec,
        readonly defaultValue: T,
        private readonly decode: (value: unknown) => T,
    ) {
        this.current = defaultValue;
    }

    get value(): T {
        return this.current;
    }

    readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    apply(record: DynamicProperty): void {
        if (record.revision <= this.revision) {
            return;
        }
        this.current = this.readSnapshot(record);
        this.revision = record.revision;
        this.listeners.forEach((listener) => listener());
    }

    readSnapshot(record?: DynamicProperty): T {
        if (!record) {
            return this.defaultValue;
        }
        if (
            record.type !== this.definition.type ||
            record.key !== this.definition.key
        ) {
            throw new Error(
                `Incompatible dynamic property type: ${this.definition.key}`,
            );
        }
        const value: unknown = JSON.parse(record.value);
        return this.decode(value);
    }

    reset(): void {
        if (
            this.revision === -1 &&
            Object.is(this.current, this.defaultValue)
        ) {
            return;
        }
        this.current = this.defaultValue;
        this.revision = -1;
        this.listeners.forEach((listener) => listener());
    }
}
