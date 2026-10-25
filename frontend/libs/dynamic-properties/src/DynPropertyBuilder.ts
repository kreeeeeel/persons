import { DynProperty } from "@persons/dynamic-properties/DynProperty";
import type { DynamicProperty } from "@persons/dynamic-properties/types";

export class DynPropertyBuilder<T> {
    private text = "";
    private externalValue = false;

    constructor(
        private readonly key: string,
        private readonly type: DynamicProperty["type"],
        private readonly initial: T,
        private readonly decode: (value: unknown) => T,
        private readonly schema: Record<string, unknown>,
    ) {}

    description(value: string): this {
        this.text = value;
        return this;
    }

    external(): this {
        this.externalValue = true;
        return this;
    }

    build(): DynProperty<T> {
        return new DynProperty(
            {
                key: this.key,
                type: this.type,
                defaultValue: JSON.stringify(this.initial),
                description: this.text,
                publicValue: true,
                schema: JSON.stringify(this.schema),
                external: this.externalValue,
            },
            this.initial,
            this.decode,
        );
    }
}
