// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

const SPLICE_0 = 0;

const directories: string[] = [];
const script = path.resolve(import.meta.dirname, '../tools/prepare-package.ts');
const environment = {
    ...process.env,
    CI_PIPELINE_IID: '42',
    CI_API_V4_URL: 'https://gitlab.example.test/api/v4',
    CI_PROJECT_ID: '123',
    CI_JOB_TOKEN: 'test-job-token',
};

afterEach(async () => {
    await Promise.all(directories.splice(SPLICE_0).map((directory) => rm(directory, { recursive: true })));
});

async function createPackage(manifest: Record<string, unknown>) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'persons-package-test-'));

    directories.push(directory);
    await writeFile(path.join(directory, 'package.json'), JSON.stringify(manifest));

    return directory;
}

test('publishes matching internal peer versions without changing external peers', async () => {
    const directory = await createPackage({
        name: '@persons/theme',
        version: '0.1.0',
        private: true,
        peerDependencies: { '@persons/ui': '0.1.0', react: '^19.0.0' },
    });

    execFileSync(process.execPath, [script, directory], { env: environment });

    const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));

    expect(manifest).toMatchObject({
        version: '0.1.0-42',
        private: false,
        peerDependencies: { '@persons/ui': '0.1.0-42', react: '^19.0.0' },
    });
    expect(manifest.files).toContain('src');
    expect(manifest.files).toContain('*.ts');
    expect(await readFile(path.join(directory, '.npmrc'), 'utf8')).toBe(
        '@persons:registry=https://gitlab.example.test/api/v4/projects/123/packages/npm/\n' +
            '//gitlab.example.test/api/v4/projects/123/packages/npm/:_authToken=test-job-token\n',
    );
});

test('preserves generated SDK distribution files', async () => {
    const directory = await createPackage({ version: '0.1.0', files: ['.build/dist'] });

    execFileSync(process.execPath, [script, directory], { env: environment });

    const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));

    expect(manifest.files).toEqual(['.build/dist']);
});

test('rejects incomplete CI credentials before modifying the package', async () => {
    const original = { version: '0.1.0', private: true };
    const directory = await createPackage(original);

    expect(() =>
        execFileSync(process.execPath, [script, directory], {
            env: { ...environment, CI_JOB_TOKEN: '' },
            stdio: 'pipe',
        }),
    ).toThrow();
    expect(JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))).toEqual(original);
    await expect(readFile(path.join(directory, '.npmrc'))).rejects.toThrow();
});
