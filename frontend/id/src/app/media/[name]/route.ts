import { getServerConfig } from '@/shared/config/server';

const MEDIA_TYPES: Record<string, string> = {
    'empty-sessions-nikita-v1.webp': 'image/webp',
    'logo.svg': 'image/svg+xml',
    'mail.svg': 'image/svg+xml',
    'error-page-stepa-slava-v1.webp': 'image/webp',
    'error-modal-nikita-v1.webp': 'image/webp',
    'friends-v1.webp': 'image/webp',
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const type = MEDIA_TYPES[name];

    if (typeof type !== 'string') {
        return new Response(null, { status: 404 });
    }

    try {
        const upstream = await fetch(`${getServerConfig().assetBaseUrl}/${name}`, {
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
        });

        if (!upstream.ok) {
            return new Response(null, { status: 503 });
        }

        return new Response(upstream.body, {
            headers: {
                'Content-Type': type,
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch {
        return new Response(null, { status: 503 });
    }
}
