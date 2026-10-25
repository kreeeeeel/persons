import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIRECTORY_ARGUMENT_INDEX = 2;
const JSON_INDENT_SPACES = 4;

const directory = path.resolve(process.argv[DIRECTORY_ARGUMENT_INDEX] ?? '.');
const pipeline = process.env.CI_PIPELINE_IID;
const api = process.env.CI_API_V4_URL;
const project = process.env.CI_PROJECT_ID;
const token = process.env.CI_JOB_TOKEN;

if (!pipeline || !/^\d+$/.test(pipeline) || !api || !project || !token) {
    throw new Error('GitLab package publishing requires CI pipeline and registry variables');
}

const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as {
    version: string;
    private?: boolean;
    files?: string[];
    peerDependencies?: Record<string, string>;
};
manifest.version = `0.1.0-${pipeline}`;
manifest.private = false;
manifest.files ??= ['src', 'assets', 'fonts', '*.ts', '*.svg', 'README.md'];
for (const name of Object.keys(manifest.peerDependencies ?? {})) {
    if (name.startsWith('@persons/') && manifest.peerDependencies) {
        manifest.peerDependencies[name] = manifest.version;
    }
}
const registry = new URL(`${api}/projects/${project}/packages/npm/`);
await writeFile(path.join(directory, 'package.json'), JSON.stringify(manifest, null, JSON_INDENT_SPACES) + '\n');
await writeFile(
    path.join(directory, '.npmrc'),
    `@persons:registry=${registry.href}\n//${registry.host}${registry.pathname}:_authToken=${token}\n`,
);
