import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const assets = [
    'empty-dota-lifestealer-vadim-v3',
    'empty-cs-sas-vadim-v2',
    'empty-search-artem-v1',
    'empty-sessions-nikita-v1',
    'empty-restrictions-yuri-v1',
    'empty-publications-krel-v1',
    'empty-moderation-slava-v1',
    'empty-settings-evgeny-v1',
];

test('new empty illustrations are transparent, documented and deployable through every consuming app', async (context) => {
    const initializer = await readFile(new URL('../../../docker/minio/initialize.sh', import.meta.url), 'utf8');
    const publicRoute = await readFile(new URL('../../person/src/app/media/[name]/route.ts', import.meta.url), 'utf8');
    const adminRoute = await readFile(new URL('../../person-admin/src/app/media/[name]/route.ts', import.meta.url), 'utf8');
    const idRoute = await readFile(new URL('../../id/src/app/media/[name]/route.ts', import.meta.url), 'utf8');

    await Promise.all(assets.map((name, index) => context.test(name, async () => {
        const webp = await readFile(new URL(`../illustrations/${name}.webp`, import.meta.url));
        assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
        assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
        assert.equal(webp.toString('ascii', 12, 16), 'VP8X');
        assert.ok(webp[20] & 0x10, 'WebP must preserve its alpha channel');
        assert.ok(webp.readUIntLE(24, 3) + 1 <= 640);
        assert.ok(webp.readUIntLE(27, 3) + 1 <= 640);
        const prompt = JSON.parse(await readFile(new URL(`../illustrations/${name}.prompt.json`, import.meta.url), 'utf8'));
        assert.ok(JSON.stringify(prompt).includes('люди'), 'Use the original friend reference');
        assert.ok(JSON.stringify(prompt).includes('image_gen'), 'Record the generation tool');
        assert.ok(initializer.includes(`/assets/illustrations/${name}.webp`), 'Upload the source asset to S3');
        assert.ok(publicRoute.includes(`'${name}.webp': 'image/webp'`), 'Public app must allow the image');
        if (index >= 2) {
            assert.ok(adminRoute.includes(`'${name}.webp': 'image/webp'`), 'CMS must allow shared illustrations');
        }
        if (name === 'empty-sessions-nikita-v1') {
            assert.ok(idRoute.includes(`'${name}.webp': 'image/webp'`), 'ID must allow the session illustration');
        }
    })));
});
