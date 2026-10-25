import "server-only";

import type { DynProperty } from "@persons/dynamic-properties/DynProperty";
import { ServerDynPropertyClient } from "@persons/dynamic-properties/ServerDynPropertyClient";

type DynProxyOptions = {
    readonly url: string;
    readonly publicUrl: string;
    readonly scope: string;
    readonly properties: readonly DynProperty<unknown>[];
    readonly serviceToken: () => string;
    readonly sessionToken: () => Promise<string | undefined>;
};

export function createDynPropertyProxy(
    input: DynProxyOptions | (() => DynProxyOptions),
) {
    let connection:
        | { options: DynProxyOptions; runtime: ServerDynPropertyClient }
        | undefined;
    const connect = () => {
        if (!connection) {
            const options = typeof input === "function" ? input() : input;
            connection = {
                options,
                runtime: new ServerDynPropertyClient({
                    ...options,
                    definitions: options.properties
                        .filter((property) => !property.definition.external)
                        .map((property) => property.definition),
                }),
            };
        }
        return connection;
    };
    const handle = async (
        request: Request,
        path: readonly string[],
    ): Promise<Response> => {
        const { options, runtime } = connect();
        const route = `/${path.map(encodeURIComponent).join("/")}`;
        if (
            request.method !== "GET" &&
            request.headers.get("origin") !== new URL(options.publicUrl).origin
        ) {
            return Response.json({ code: "FORBIDDEN" }, { status: 403 });
        }
        const publicRoute =
            route === "/v1/dynamic-properties/public" ||
            route === "/v1/dynamic-properties/events";
        const adminRoute =
            /^\/v1\/admin\/variables(?:\/[a-zA-Z][a-zA-Z0-9.]*)?$/.test(route);
        if (
            (!publicRoute && !adminRoute) ||
            !["GET", "PUT"].includes(request.method) ||
            (publicRoute && request.method !== "GET")
        ) {
            return Response.json({ code: "NOT_FOUND" }, { status: 404 });
        }
        await runtime.initialize();
        if (route === "/v1/dynamic-properties/public") {
            return Response.json(runtime.snapshot(), {
                headers: { "Cache-Control": "no-store" },
            });
        }
        const session = adminRoute ? await options.sessionToken() : undefined;
        if (adminRoute && !session) {
            return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
        }
        const headers = new Headers({
            "X-Service-Authorization": `Bearer ${options.serviceToken()}`,
        });
        if (session) {
            headers.set("Authorization", `Bearer ${session}`);
        }
        if (request.method === "PUT") {
            headers.set("Content-Type", "application/json");
        }
        const upstream = await fetch(`${options.url}${route}`, {
            method: request.method,
            headers,
            cache: "no-store",
            signal: request.signal,
            body: request.method === "PUT" ? await request.text() : undefined,
        });
        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                "Content-Type":
                    upstream.headers.get("Content-Type") ?? "application/json",
                "Cache-Control": "no-store",
                "X-Accel-Buffering": "no",
            },
        });
    };
    return Object.assign(handle, {
        initialize: () => connect().runtime.initialize(),
        snapshot: () => connect().runtime.snapshot(),
    });
}
