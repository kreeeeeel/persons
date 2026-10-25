import { ResponseError } from "@persons/dynamic-properties-client";

export async function dynamicPropertyError(error: unknown): Promise<string> {
    if (!(error instanceof ResponseError)) {
        return "UNAVAILABLE";
    }
    const codes: Readonly<Record<number, string>> = {
        400: "INVALID_INPUT",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        409: "CONFLICT",
    };
    return codes[error.response.status] ?? "UNAVAILABLE";
}
