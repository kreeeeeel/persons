'use client';

import { createContext } from 'react';

export const LoadingFailureContext = createContext<(source: string, failed: boolean) => void>(() => undefined);
