import { getServerConfig } from '@/shared/config/server';

const FLAG_FILE = /^[a-z]{2}\.svg$/;

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;

    if (!FLAG_FILE.test(name)) {
        return new Response(null, { status: 404 });
    }

    try {
        const response = await fetch(`${getServerConfig().assetBaseUrl}/flags/${name}`, {
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return new Response(null, { status: response.status === 404 ? 404 : 503 });
        }

        return new Response(response.body, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch {
        return new Response(null, { status: 503 });
    }
}
