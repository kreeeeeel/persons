import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { copyAssetIfChanged } from '../copyAssetIfChanged.mjs';

test('asset preparation preserves unchanged files and updates changed or missing assets', async () => {
    const prefix = path.join(tmpdir(), 'persons-asset-sync-');
    const directory = await mkdtemp(prefix);
    const source = path.join(directory, 'source.svg');
    const target = path.join(directory, 'icon.svg');

    try {
        await writeFile(source, '<svg/>');
        assert.equal(await copyAssetIfChanged(source, target), true);
        assert.equal(await readFile(target, 'utf8'), '<svg/>');

        const previous = new Date('2020-01-01T00:00:00Z');
        await utimes(target, previous, previous);
        const before = await stat(target);
        assert.equal(await copyAssetIfChanged(source, target), false);
        assert.equal((await stat(target)).mtimeMs, before.mtimeMs);

        await writeFile(source, '<svg><path/></svg>');
        assert.equal(await copyAssetIfChanged(source, target), true);
        assert.equal(await readFile(target, 'utf8'), '<svg><path/></svg>');
        await assert.rejects(copyAssetIfChanged(path.join(directory, 'missing.svg'), target), { code: 'ENOENT' });
        assert.equal(await readFile(target, 'utf8'), '<svg><path/></svg>');
    } finally {
        assert.ok(directory.startsWith(prefix));
        assert.equal(path.dirname(directory), path.resolve(tmpdir()));
        await rm(directory, { recursive: true });
    }
});
