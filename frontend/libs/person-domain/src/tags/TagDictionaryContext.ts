"use client";

import { createContext } from "react";
import type { TagDefinition } from "@persons/person-client";

export const TagDictionaryContext = createContext<{
    definitions: readonly TagDefinition[];
    loading: boolean;
    error?: string;
    refresh?: () => void;
}>({ definitions: [], loading: false });
