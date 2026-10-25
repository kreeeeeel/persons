import { DynPropertyBuilder } from "@persons/dynamic-properties/DynPropertyBuilder";

function boolean(value: unknown): boolean {
    if (typeof value !== "boolean") {
        throw new Error("Expected a boolean dynamic property");
    }
    return value;
}

function string(value: unknown): string {
    if (typeof value !== "string") {
        throw new Error("Expected a string dynamic property");
    }
    return value;
}

export const DynPropertyFactory = {
    createBoolean(key: string, value = false) {
        return new DynPropertyBuilder(key, "BOOLEAN", value, boolean, {
            type: "boolean",
        });
    },
    createString(key: string, value = "") {
        return new DynPropertyBuilder(key, "STRING", value, string, {
            type: "string",
        });
    },
    createInteger(
        key: string,
        value: number,
        minimum = -2147483648,
        maximum = 2147483647,
    ) {
        return new DynPropertyBuilder(
            key,
            "NUMBER",
            value,
            (candidate) => {
                if (
                    typeof candidate !== "number" ||
                    !Number.isSafeInteger(candidate) ||
                    candidate < minimum ||
                    candidate > maximum
                ) {
                    throw new Error("Invalid integer dynamic property");
                }
                return candidate;
            },
            { type: "integer", minimum, maximum },
        );
    },
    createJson<T>(key: string, value: T, decode: (candidate: unknown) => T) {
        return new DynPropertyBuilder(key, "JSON", value, decode, {});
    },
    createStringMap(key: string, value: Readonly<Record<string, string>>) {
        return new DynPropertyBuilder(
            key,
            "MAP",
            value,
            (candidate) => {
                if (
                    !candidate ||
                    typeof candidate !== "object" ||
                    Array.isArray(candidate) ||
                    Object.values(candidate).some(
                        (item) => typeof item !== "string",
                    )
                ) {
                    throw new Error("Invalid string map dynamic property");
                }
                return candidate as Readonly<Record<string, string>>;
            },
            { type: "object", additionalProperties: { type: "string" } },
        );
    },
};
