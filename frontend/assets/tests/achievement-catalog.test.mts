import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

interface Definition {
    key: string;
    file: string;
    title: string;
    description: string;
    type: string;
    pageAgeYears?: number;
}

const assets = new URL('../achievements/', import.meta.url);
const catalogs = await Promise.all(
    ['anniversaries-and-habits.json', 'community-jokes.json'].map(async (file) =>
        JSON.parse(await readFile(new URL(file, assets), 'utf8')) as { assets: Definition[] },
    ),
);
const definitions = catalogs.flatMap((catalog) => catalog.assets);

test('imported catalogs have unique keys, titles and image files', () => {
    assert.ok(definitions.length > 0);
    (['key', 'title', 'file'] as const).forEach((field) => {
        const values = definitions.map((definition) => definition[field]);
        assert.equal(new Set(values).size, values.length, `Duplicate ${field}`);
    });
});

test('every imported achievement has valid metadata and its own transparent PNG', async (context) => {
    await Promise.all(definitions.map((definition) => context.test(definition.key, async () => {
        assert.match(definition.key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        assert.match(definition.file, /^[a-z0-9-]+-v\d+\.png$/);
        [definition.title, definition.description].forEach((text) => {
            assert.ok(text.trim().length > 0);
            assert.equal(text, text.trim());
        });
        assert.ok(['MANUAL', 'AUTOMATIC'].includes(definition.type));
        if (definition.type === 'AUTOMATIC') {
            const years = definition.pageAgeYears;
            assert.ok(typeof years === 'number');
            assert.ok(Number.isInteger(years) && years >= 1 && years <= 5);
        } else {
            assert.equal(definition.pageAgeYears, undefined);
        }

        const png = await readFile(new URL(definition.file, assets));
        assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        assert.equal(png.toString('ascii', 12, 16), 'IHDR');
        assert.equal(png.readUInt32BE(16), png.readUInt32BE(20), 'Badge must be square');
        assert.ok(png.readUInt32BE(16) >= 512, 'Badge must support high-density displays');
        assert.equal(png[24], 8, 'Badge must use 8-bit channels');
        assert.equal(png[25], 6, 'Badge must have an RGBA channel');
    })));
});
