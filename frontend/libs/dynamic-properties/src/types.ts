import type {
    DynDefinitionInput,
    DynamicProperty,
} from "@persons/dynamic-properties-client";

export type { DynamicProperty, DynDefinitionInput };
export interface DynPropertySpec extends DynDefinitionInput {
    readonly external: boolean;
}
export interface DynClientOptions {
    readonly url: string;
    readonly properties: readonly import("@persons/dynamic-properties/DynProperty").DynProperty<unknown>[];
    readonly initialValues?: readonly DynamicProperty[];
}
