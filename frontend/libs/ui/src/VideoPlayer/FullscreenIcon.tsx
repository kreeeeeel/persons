import { Box } from '@gravity-ui/uikit';

export function FullscreenIcon({ active }: { readonly active: boolean }) {
    return (
        <Box
            as="svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <Box
                as="path"
                d={active ? 'M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6' : 'M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6'}
            />
        </Box>
    );
}
