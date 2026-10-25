"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useSyncExternalStore,
} from "react";
import type { PropsWithChildren } from "react";
import { DynPropertyClient } from "@persons/dynamic-properties/DynPropertyClient";
import type { DynProperty } from "@persons/dynamic-properties/DynProperty";
import type { DynClientOptions } from "@persons/dynamic-properties/types";

const Context = createContext<DynPropertyClient | undefined>(undefined);
const emptySubscribe = () => () => undefined;
const idle: { ready: boolean; error?: Error } = { ready: false };
const idleSnapshot = () => idle;

export function DynPropertyProvider({
    children,
    ...options
}: PropsWithChildren<DynClientOptions>) {
    const [client] = useState(() => new DynPropertyClient(options));
    useEffect(() => {
        void client.start();
        return () => client.close();
    }, [client]);
    return <Context.Provider value={client}>{children}</Context.Provider>;
}

export function useDynProperty<T>(property: DynProperty<T>): T {
    const client = useContext(Context);
    return useSyncExternalStore(
        property.subscribe,
        () => property.value,
        () => client?.serverValue(property) ?? property.defaultValue,
    );
}

export function useDynPropertiesStatus() {
    const client = useContext(Context);
    const state = useSyncExternalStore(
        client?.subscribe ?? emptySubscribe,
        client?.snapshot ?? idleSnapshot,
        idleSnapshot,
    );
    return { ...state, refresh: () => client?.start() };
}
