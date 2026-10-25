'use client';

import { createContext } from 'react';

export const LoadErrorContext = createContext<'page' | 'dialog'>('page');
