import type { IncomingMessage, ServerResponse } from 'node:http';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PersonProfile } from '@persons/person-client';
const { createPreviewContent }: typeof import('./preview-content') = await import(
    new URL('./preview-content.ts', import.meta.url).href
);

function profile(): PersonProfile {
    return {
        id: 'person',
        tag: 'friend',
        fullName: 'Друг',
        firstName: 'Друг',
        lastName: '',
        description: '',
        tags: [],
        socialLinks: [],
        ratingOptions: [],
        canEdit: false,
        version: 0,
        stats: {
            views: 0,
            comments: 0,
            ratings: 0,
            moments: 0,
            photos: 0,
            creditEntries: 0,
            creditScore: 0,
            reputation: 'UNKNOWN',
        },
    };
}

async function readPreview(pathname: string, empty: boolean, authenticated = true) {
    let status = 0;
    let body = '';
    const writeHead = (value: number) => {
        status = value;
    };
    const end = (value: string) => {
        body = value;
    };
    const handler = createPreviewContent([profile()], '.', empty);
    assert.equal(
        await handler(
            { method: 'GET' } as IncomingMessage,
            { writeHead, end } as unknown as ServerResponse,
            new URL(pathname, 'http://localhost'),
            authenticated,
        ),
        true,
    );
    return { status, body: JSON.parse(body) };
}

test('keeps populated content as the default preview and supports an empty review fixture', async () => {
    const populated = await readPreview('/v1/publications/mine', false);
    assert.ok(populated.body.items.length > 0);
    const empty = await readPreview('/v1/publications/mine', true);
    assert.deepEqual(empty.body.items, []);
    assert.equal(empty.body.total, 0);
});

test('shows empty recommendations and profile content in the empty review fixture', async () => {
    assert.deepEqual((await readPreview('/v1/persons/recommendations', true)).body, []);
    const comments = await readPreview('/v1/persons/person/comments', true);
    assert.deepEqual(comments.body.items, []);
    assert.equal(comments.body.total, 0);
});

test('keeps private publications protected in the empty review fixture', async () => {
    assert.deepEqual(await readPreview('/v1/publications/mine', true, false), {
        status: 401,
        body: { code: 'UNAUTHORIZED' },
    });
});

test('serves the aggregate contract for local review while keeping production fixtures out of application modules', async () => {
    const directory = await readPreview('/v1/persons/directory', false);
    assert.equal(directory.body.items[0].tag, 'friend');
    const feed = await readPreview('/v1/feed', false);
    assert.ok(feed.body.items.some((item: { kind: string }) => item.kind === 'WALL'));
    assert.ok(feed.body.items.some((item: { kind: string }) => item.kind === 'PHOTO'));
    const filtered = await readPreview('/v1/feed?kind=RATING&size=1', false);
    assert.equal(filtered.body.total, 1);
    assert.equal(filtered.body.items[0].kind, 'RATING');
    assert.equal((await readPreview('/v1/feed', true)).body.total, 0);
});
