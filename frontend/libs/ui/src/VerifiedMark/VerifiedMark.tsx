import { Box } from '@gravity-ui/uikit';

export function VerifiedMark() {
    return (
        <Box as="svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <Box
                as="path"
                d="m12 1.5 2.7 1.8 3.2.4 1.4 2.9 2.4 2.2-.5 3.2.5 3.2-2.4 2.2-1.4 2.9-3.2.4-2.7 1.8-2.7-1.8-3.2-.4-1.4-2.9-2.4-2.2.5-3.2-.5-3.2 2.4-2.2 1.4-2.9 3.2-.4L12 1.5Z"
                fill="currentColor"
            />
            <Box
                as="path"
                d="m7.5 12 3 3 6-6"
                stroke="var(--g-color-text-brand-contrast)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Box>
    );
}
