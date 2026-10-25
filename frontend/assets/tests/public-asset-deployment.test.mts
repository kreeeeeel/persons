import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('every public WebP illustration is included in the S3 deployment', async () => {
    const [route, initializer] = await Promise.all([
        readFile(new URL('../../person/src/app/media/[name]/route.ts', import.meta.url), 'utf8'),
        readFile(new URL('../../../docker/minio/initialize.sh', import.meta.url), 'utf8'),
    ]);
    const images = Array.from(route.matchAll(/['"]([^'"]+\.webp)['"]:\s*['"]image\/webp['"]/g), ([, name]) => name);
    const deployed = new Set(Array.from(initializer.matchAll(/local\/"\$bucket"\/assets\/([a-z0-9-]+\.webp)/g), ([, name]) => name));

    assert.ok(images.length > 0, 'The public illustration allowlist must not be empty');
    assert.deepEqual(images.filter((name) => !deployed.has(name)), [], 'Public illustrations must be uploaded to S3');

    await Promise.all(images.map(async (name) => {
        const image = await readFile(new URL(`../illustrations/${name}`, import.meta.url));
        assert.equal(image.toString('ascii', 0, 4), 'RIFF', name);
        assert.equal(image.toString('ascii', 8, 12), 'WEBP', name);
    }));
});
