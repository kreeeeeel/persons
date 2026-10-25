import { idApi } from '@/shared/api/server';

const HTTP_NOT_FOUND = 404;

export async function GET() {
    try {
        const avatar = await (await idApi()).getAvatar();

        return new Response(avatar, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch {
        return new Response(null, { status: HTTP_NOT_FOUND });
    }
}
