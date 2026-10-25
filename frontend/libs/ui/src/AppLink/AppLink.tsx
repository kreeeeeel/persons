'use client';

import NextLink from 'next/link';
import { Link } from '@gravity-ui/uikit';
import type { LinkProps } from '@gravity-ui/uikit';

export function AppLink({ href, ...props }: LinkProps) {
    return (
        <NextLink href={href} passHref legacyBehavior prefetch={false}>
            <Link {...props} href={href} />
        </NextLink>
    );
}
