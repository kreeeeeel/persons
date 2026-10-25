import { getServerConfig } from '@/shared/config/server';

const MEDIA_TYPES: Record<string, string> = {
    'empty-search-artem-v1.webp': 'image/webp',
    'empty-sessions-nikita-v1.webp': 'image/webp',
    'empty-restrictions-yuri-v1.webp': 'image/webp',
    'empty-publications-krel-v1.webp': 'image/webp',
    'empty-moderation-slava-v1.webp': 'image/webp',
    'empty-settings-evgeny-v1.webp': 'image/webp',
    'empty-ratings-yuri-v1.webp': 'image/webp',
    'empty-comments-slava-v1.webp': 'image/webp',
    'upload-evgeny-v1.webp': 'image/webp',
    'empty-photos-tyamik-v1.webp': 'image/webp',
    'empty-loans-vadim-v3.webp': 'image/webp',
    'restricted-vadim-v1.webp': 'image/webp',
    'play-console-v3.webp': 'image/webp',
    'play-board-v3.webp': 'image/webp',
    'play-hockey-v3.webp': 'image/webp',
    'play-racing-v3.webp': 'image/webp',
    'play-tower-v3.webp': 'image/webp',
    'play-puzzle-v3.webp': 'image/webp',
    'play-chess-v3.webp': 'image/webp',
    'sofa-friends-v1.webp': 'image/webp',
    'empty-media-nikita-v2.webp': 'image/webp',
    'empty-achievements-evgeny-v2.webp': 'image/webp',
    'empty-notifications-stepa-v2.webp': 'image/webp',
    'empty-wall-krel-v2.webp': 'image/webp',
    'empty-loans-vadim-v2.webp': 'image/webp',
    'empty-my-page-slava-v2.webp': 'image/webp',
    'empty-wall-krel-v1.webp': 'image/webp',
    'empty-media-tyamik-v1.webp': 'image/webp',
    'empty-history-vadim-v1.webp': 'image/webp',
    'not-found-vadim-v1.webp': 'image/webp',
    'social-telegram.svg': 'image/svg+xml',
    'social-steam.svg': 'image/svg+xml',
    'social-discord.svg': 'image/svg+xml',
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
