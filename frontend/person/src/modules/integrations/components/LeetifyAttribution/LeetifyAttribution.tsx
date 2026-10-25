'use client';

import { Link, useTheme } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';

export function LeetifyAttribution() {
    const theme = useTheme();
    return (
        <Link href="https://leetify.com/" target="_blank" rel="noopener noreferrer">
            <LoadedImage
                src={`/assets/integrations/leetify/attribution-${theme === 'dark' ? 'dark' : 'light'}.png`}
                alt="Data Provided by Leetify"
                width={108}
                height={46}
                objectFit="contain"
            />
        </Link>
    );
}
