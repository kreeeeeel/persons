import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PersonProfile } from '@persons/person-client';
import type { DynamicProperty } from '@persons/dynamic-properties';
import type { DirectoryPerson } from '@test/fixtures/DirectoryPerson';

const { demoPeople }: { readonly demoPeople: readonly DirectoryPerson[] } = await import(
    new URL('../tests/fixtures/demoPeople.ts', import.meta.url).href
);

const profiles: PersonProfile[] = demoPeople.map((person, index) => ({
    id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, '0')}`,
    tag: person.tag,
    fullName: person.name.ru,
    firstName: person.name.ru,
    lastName: '',
    description: 'Свои люди, свои истории.',
    tags: [],
    socialLinks: [],
    ratingOptions: [],
    canEdit: false,
    version: 0,
    stats: {
        views: person.views,
        comments: 0,
        ratings: 0,
        moments: 0,
        photos: 0,
        creditEntries: 0,
        creditScore: 0,
        reputation: 'UNKNOWN',
    },
}));

// Disposable, loopback-only fixtures for visual review. This tool never contacts real services.
const PORT = 4310;
const MAX_BODY_BYTES = 65536;
const TOKEN = 'local-community-preview';
const demoUser = {
    id: '00000000-0000-4000-8000-000000000001',
    firstName: 'Крел',
    lastName: '',
    email: 'admin@example.test',
    locale: 'ru',
    hasAvatar: false,
    role: 'ADMIN',
};
const assetsRoot = path.resolve(import.meta.dirname, '../../assets');
const { createPreviewContent }: typeof import('./preview-content') = await import(
    new URL('./preview-content.ts', import.meta.url).href
);
const notificationFixtures = profiles.slice(0, 3).map((profile, index) => ({
    id: randomUUID(),
    kind: 'APPROVED',
    subject: ['Комментарий опубликован', 'Фотография опубликована', 'Момент опубликован'][index],
    personTag: profile.tag,
    createdAt: new Date(Date.now() - index * 60_000),
    read: false,
}));
const assets = new Map<string, string>([
    ['logo.svg', path.join(assetsRoot, 'logo.svg')],
    ['mail.svg', path.join(assetsRoot, 'mail.svg')],
]);

for (const directory of ['illustrations', 'social']) {
    for (const file of await readdir(path.join(assetsRoot, directory))) {
        if (/\.(webp|png|svg)$/.test(file)) {
            assets.set(file, path.join(assetsRoot, directory, file));
        }
    }
}

function fixture(key: string, type: DynamicProperty['type'], value: unknown, description?: string): DynamicProperty {
    return {
        key,
        description,
        type,
        value: JSON.stringify(value),
        defaultValue: JSON.stringify(value),
        publicValue: !key.startsWith('publication.') && !key.startsWith('games.'),
        revision: 0,
    };
}

const properties = [
    fixture('games.dotabuff.enabled', 'BOOLEAN', false, 'Включить синхронизацию матчей DotaBuff'),
    fixture('games.dotabuff.importFrom', 'INSTANT', '2026-10-22T00:00:00Z', 'Дата начала импорта матчей DotaBuff'),
    fixture('games.dotabuff.pollIntervalSeconds', 'NUMBER', 300, 'Интервал проверки DotaBuff в секундах'),
    fixture('games.leetify.enabled', 'BOOLEAN', false, 'Включить синхронизацию матчей Leetify'),
    fixture('games.leetify.importFrom', 'INSTANT', '2026-10-23T00:00:00Z', 'Дата начала импорта матчей Leetify'),
    fixture('games.leetify.pollIntervalSeconds', 'NUMBER', 300, 'Интервал проверки Leetify в секундах'),
    fixture('site.marqueeEnabled', 'BOOLEAN', true),
    fixture('legal.supportEmail', 'STRING', 'privacy@example.test'),
    fixture('legal.operatorNames', 'MAP', {
        ru: 'Сервис «Те ещё люди»',
        en: 'Те ещё люди service',
    }),
    fixture('catalog.pageSize', 'NUMBER', 6),
    fixture('site.noticeTexts', 'JSON', {
        ru: ['Все персонажи вымышленные, совпадения случайны', 'На сайте используется контент, созданный с помощью ИИ'],
        en: ['All characters are fictional; any resemblance is coincidental', 'This site uses AI-generated content'],
    }),
    ...['comments', 'photos', 'moments', 'reviews', 'loans', 'pages', 'profileChanges', 'avatars'].map((kind) =>
        fixture(`publication.${kind}RequireModeration`, 'BOOLEAN', true),
    ),
];

const eventClients = new Set<ServerResponse>();
const scopes = new Map<string, Set<string>>();
const publicProperties = () => properties.filter((property) => property.publicValue);
const broadcast = () =>
    eventClients.forEach((client) => client.write(`data: ${JSON.stringify(publicProperties())}\n\n`));
const { previewMatches }: typeof import('../src/modules/integrations/model/previewMatches') = await import(
    new URL('../src/modules/integrations/model/previewMatches.ts', import.meta.url).href
);
const gameFixtures = previewMatches.map((match, index) => ({
    ...match,
    id: String(8000000001 + index),
    won: match.result === 'victory',
    heroIconUrl: `/assets/integrations/dotabuff/${match.heroId}-icon.png`,
    heroImageUrl: `/assets/integrations/dotabuff/${match.heroId}.png`,
    durationSeconds: Number(match.duration.split(':')[0]) * 60 + Number(match.duration.split(':')[1]),
    items: match.items.map((item) => ({ ...item, imageUrl: `/assets/integrations/dotabuff/${item.id}.png` })),
    neutralItem: match.neutralItem
        ? { ...match.neutralItem, imageUrl: `/assets/integrations/dotabuff/${match.neutralItem.id}.png` }
        : undefined,
}));

const { previewCsMatches }: typeof import('../src/modules/integrations/model/previewCsMatches') = await import(
    new URL('../src/modules/integrations/model/previewCsMatches.ts', import.meta.url).href
);
const csFixtures = previewCsMatches.map((match) => ({ ...match, playedAt: new Date(match.playedAt) }));
const handleContent = createPreviewContent(profiles, assetsRoot, process.env.PREVIEW_EMPTY_CONTENT === 'true', [
    ...gameFixtures.map((dota) => ({
        id: `dota:${dota.id}`,
        kind: 'DOTA' as const,
        page: profiles[0],
        createdAt: new Date(dota.playedAt),
        dota: { ...dota, playedAt: new Date(dota.playedAt) },
    })),
    ...csFixtures.map((cs) => ({
        id: `cs:${cs.id}`,
        kind: 'CS' as const,
        page: profiles[0],
        createdAt: cs.playedAt,
        cs,
    })),
]);

function publicSettings() {
    const value = (key: string): unknown =>
        JSON.parse(properties.find((property) => property.key === key)?.value ?? 'null');
    return {
        marqueeEnabled: value('site.marqueeEnabled'),
        supportEmail: value('legal.supportEmail'),
        operatorNames: value('legal.operatorNames'),
        catalogPageSize: value('catalog.pageSize'),
        noticeTexts: value('site.noticeTexts'),
    };
}

function json(response: ServerResponse, status: number, value: unknown) {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(value));
}

async function readBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of request) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_BODY_BYTES) {
            throw new Error('Preview request is too large');
        }
        chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
    const authenticated = request.headers.authorization === `Bearer ${TOKEN}`;
    if (url.pathname === '/v1/dynamic-properties/public') {
        json(response, 200, publicProperties());
        return;
    }
    if (url.pathname === '/v1/dynamic-properties/events') {
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
        });
        response.write(`data: ${JSON.stringify(publicProperties())}\n\n`);
        eventClients.add(response);
        const timer = setInterval(() => response.write(': heartbeat\n\n'), 15000);
        timer.unref();
        request.on('close', () => {
            eventClients.delete(response);
            clearInterval(timer);
        });
        return;
    }
    if (url.pathname.startsWith('/v1/dynamic-properties/registrations/') && request.method === 'PUT') {
        if (!request.headers['x-service-authorization']) {
            json(response, 401, { code: 'UNAUTHORIZED' });
            return;
        }
        const definitions = await readBody(request);
        if (!Array.isArray(definitions)) {
            json(response, 400, { code: 'INVALID_INPUT' });
            return;
        }
        const scope = url.pathname.split('/').at(-1) ?? '';
        const keys = new Set<string>();
        for (const definition of definitions) {
            if (
                typeof definition.key !== 'string' ||
                !definition.key.startsWith('frontend.') ||
                !definition.publicValue
            ) {
                json(response, 400, { code: 'INVALID_INPUT' });
                return;
            }
            keys.add(definition.key);
            const existing = properties.find((property) => property.key === definition.key);
            if (existing) {
                if (existing.type !== definition.type || existing.defaultValue !== definition.defaultValue) {
                    existing.value = definition.defaultValue;
                    existing.revision += 1;
                }
                Object.assign(existing, {
                    type: definition.type,
                    defaultValue: definition.defaultValue,
                    description: definition.description,
                });
            } else {
                properties.push({ ...definition, value: definition.defaultValue, revision: 0 });
            }
        }
        const removed = scopes.get(scope) ?? new Set<string>();
        scopes.set(scope, keys);
        for (const key of removed) {
            if (!keys.has(key) && ![...scopes.values()].some((owned) => owned.has(key))) {
                const index = properties.findIndex((property) => property.key === key);
                if (index !== -1) {
                    properties.splice(index, 1);
                }
            }
        }
        broadcast();
        json(response, 200, publicProperties());
        return;
    }
    const historyPerson = /^\/v1\/persons\/([^/]+)\/games\/dota2\/matches$/.exec(url.pathname)?.[1];
    const csPerson = /^\/v1\/persons\/([^/]+)\/games\/cs2\/matches$/.exec(url.pathname)?.[1];
    if (csPerson || url.pathname === '/v1/games/cs2/events') {
        const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
        const size = Math.min(60, Math.max(1, Number(url.searchParams.get('size') ?? 12)));
        const owner = profiles.find((profile) => profile.tag === 'krel') ?? profiles[0];
        const items = csPerson
            ? csPerson === owner.id
                ? csFixtures
                : []
            : csFixtures.map((match) => ({ page: owner, match }));
        json(response, 200, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
        return;
    }
    if (historyPerson || url.pathname === '/v1/games/dota2/events') {
        const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
        const size = Math.min(60, Math.max(1, Number(url.searchParams.get('size') ?? 12)));
        const owner = profiles.find((profile) => profile.tag === 'krel') ?? profiles[0];
        const items = historyPerson
            ? historyPerson === owner.id
                ? gameFixtures
                : []
            : gameFixtures.map((match) => ({ page: owner, match }));
        json(response, 200, { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length });
        return;
    }
    if (url.pathname === '/session' || url.pathname === '/feed-session') {
        const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'ru';
        response.writeHead(302, {
            'Set-Cookie': `PERSONS_SESSION=${TOKEN}; HttpOnly; SameSite=Lax; Path=/`,
            Location:
                url.pathname === '/feed-session'
                    ? `http://localhost:3002/${locale}/feed`
                    : `http://localhost:3001/${locale}/settings`,
        });
        response.end();
        return;
    }
    if (url.pathname === '/health') {
        json(response, 200, { status: 'UP', preview: true });
        return;
    }
    if (url.pathname === '/preview/moment.webm') {
        const bytes = await readFile(path.resolve(import.meta.dirname, '../.cache/feed/moment.webm'));
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
        if (start > end || start >= bytes.length) {
            response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` });
            response.end();
            return;
        }
        response.writeHead(range ? 206 : 200, {
            'Content-Type': 'video/webm',
            'Content-Length': end - start + 1,
            'Accept-Ranges': 'bytes',
            ...(range ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}),
        });
        response.end(bytes.subarray(start, end + 1));
        return;
    }
    if (url.pathname.startsWith('/assets/')) {
        const file = assets.get(url.pathname.slice('/assets/'.length));
        if (!file) {
            json(response, 404, { code: 'NOT_FOUND' });
            return;
        }
        const type = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : 'image/png';
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=60' });
        response.end(await readFile(file));
        return;
    }
    if (url.pathname.startsWith('/v1/catalogs/')) {
        const [, , , locale, namespace] = url.pathname.split('/');
        json(response, 200, { locale, namespace, messages: {} });
        return;
    }
    if (url.pathname === '/v1/access' || url.pathname === '/v1/restrictions/access') {
        json(response, 200, { signedIn: authenticated });
        return;
    }
    if (url.pathname === '/v1/site-settings') {
        json(response, 200, publicSettings());
        return;
    }
    if (url.pathname === '/v1/me') {
        json(response, authenticated ? 200 : 401, authenticated ? demoUser : { code: 'UNAUTHORIZED' });
        return;
    }
    if (url.pathname === '/v1/sessions/refresh' && request.method === 'POST') {
        json(
            response,
            authenticated ? 200 : 401,
            authenticated
                ? { token: TOKEN, expiresAt: new Date(Date.now() + 3600000), user: demoUser }
                : { code: 'UNAUTHORIZED' },
        );
        return;
    }
    if (url.pathname === '/v1/sessions' && request.method === 'GET') {
        json(
            response,
            authenticated ? 200 : 401,
            authenticated
                ? {
                      items: [
                          {
                              id: '00000000-0000-4000-8000-000000000002',
                              current: true,
                              createdAt: new Date(),
                              lastSeenAt: new Date(),
                              expiresAt: new Date(Date.now() + 3600000),
                              ip: '127.0.0.1',
                              userAgent: 'Local preview',
                              os: 'Windows',
                              osVersion: '11',
                              browser: 'Chrome',
                              device: 'DESKTOP',
                              origin: 'http://localhost:3002',
                              region: '',
                          },
                      ],
                  }
                : { code: 'UNAUTHORIZED' },
        );
        return;
    }
    if (url.pathname.startsWith('/v1/admin/')) {
        if (!authenticated) {
            json(response, 401, { code: 'UNAUTHORIZED' });
            return;
        }
        if (url.pathname === '/v1/admin/moderation' && request.method === 'GET') {
            json(response, 200, {
                items: [],
                page: 0,
                size: 20,
                total: 0,
                statistics: { pending: 0, approved: 0, rejected: 0, overdue: 0 },
            });
            return;
        }
        if (url.pathname === '/v1/admin/variables' && request.method === 'GET') {
            json(response, 200, properties);
            return;
        }
        if (url.pathname.startsWith('/v1/admin/variables/') && request.method === 'PUT') {
            const property = properties.find(
                (item) => item.key === decodeURIComponent(url.pathname.slice('/v1/admin/variables/'.length)),
            );
            const body = await readBody(request);
            if (
                !property ||
                !body ||
                typeof body !== 'object' ||
                !('value' in body) ||
                typeof body.value !== 'string' ||
                !('revision' in body)
            ) {
                json(response, 400, { code: 'INVALID_INPUT' });
                return;
            }
            if (property.revision !== body.revision) {
                json(response, 409, { code: 'CONFLICT' });
                return;
            }
            const parsed: unknown = JSON.parse(body.value);
            const valid =
                property.type === 'JSON' ||
                (['STRING', 'INSTANT', 'DURATION'].includes(property.type) && typeof parsed === 'string') ||
                (property.type === 'BOOLEAN' && typeof parsed === 'boolean') ||
                (property.type === 'NUMBER' &&
                    typeof parsed === 'number' &&
                    Number.isInteger(parsed) &&
                    parsed >= (property.key.startsWith('games.') ? 60 : 1) &&
                    parsed <= (property.key.startsWith('games.') ? 86400 : 60)) ||
                (property.type === 'MAP' && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed));
            if (!valid) {
                json(response, 400, { code: 'INVALID_INPUT' });
                return;
            }
            property.value = JSON.stringify(parsed);
            property.revision += 1;
            property.updatedAt = new Date();
            broadcast();
            json(response, 200, property);
            return;
        }
    }
    if (url.pathname === '/v1/registrations' && request.method === 'POST') {
        json(response, 200, {
            id: randomUUID(),
            expiresAt: new Date(Date.now() + 600000),
            resendAt: new Date(Date.now() + 60000),
        });
        return;
    }
    if (url.pathname.includes('/persons/search')) {
        const query = (url.searchParams.get('query') ?? url.searchParams.get('q') ?? '')
            .trim()
            .replace(/^@/, '')
            .toLowerCase();
        const items = profiles.filter((profile) => `${profile.tag} ${profile.fullName}`.toLowerCase().includes(query));
        json(response, 200, {
            items,
            hasNext: false,
            page: 0,
            size: 20,
            total: items.length,
            totalElements: items.length,
            totalPages: items.length ? 1 : 0,
        });
        return;
    }
    const profileTag = /^\/v1\/persons\/by-tag\/([^/]+)$/.exec(url.pathname)?.[1];
    const profile = profiles.find((item) => item.tag === profileTag);
    if (profile && request.method === 'GET') {
        json(response, 200, profile);
        return;
    }
    if (await handleContent(request, response, url, authenticated)) {
        return;
    }
    if (
        /^\/v1\/persons\/[^/]+\/(comments|ratings|credit|moments|photos|achievements)$/.test(url.pathname) &&
        request.method === 'GET'
    ) {
        json(response, 200, { items: [], page: 0, size: Number(url.searchParams.get('size') ?? 10), total: 0 });
        return;
    }
    if (/^\/v1\/persons\/[^/]+\/views$/.test(url.pathname) && request.method === 'POST') {
        response.writeHead(204);
        response.end();
        return;
    }
    if (url.pathname === '/v1/notifications/read' && request.method === 'POST' && authenticated) {
        notificationFixtures.forEach((item) => {
            item.read = true;
        });
        response.writeHead(204);
        response.end();
        return;
    }
    if (url.pathname === '/v1/notifications' && request.method === 'GET' && authenticated) {
        const page = Number(url.searchParams.get('page') ?? 0);
        const size = Number(url.searchParams.get('size') ?? 12);
        json(response, 200, {
            items: notificationFixtures.slice(page * size, (page + 1) * size),
            total: notificationFixtures.length,
            unread: notificationFixtures.filter((item) => !item.read).length,
            page,
            size,
        });
        return;
    }
    json(response, 404, { code: 'NOT_FOUND' });
}

createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
        console.error('Preview request failed', { cause: error instanceof Error ? error.name : 'Unknown' });
        if (!response.headersSent) {
            json(response, 400, { code: 'INVALID_INPUT' });
        } else {
            response.end();
        }
    });
}).listen(PORT, '127.0.0.1', () => {
    console.info(`Local mock API: http://localhost:${PORT}`);
});
