import type { AdminUser } from '@persons/person-client';

export type BrowserAdminUser = Omit<AdminUser, 'createdAt'> & { readonly createdAt: string };
