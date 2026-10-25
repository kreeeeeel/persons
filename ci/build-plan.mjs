import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, statSync, existsSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clientInputs, imageVariable, services} from './build-inputs.mjs';
import {generatePipeline} from './generate-pipeline.mjs';

const digest = (value) => createHash('sha1').update(JSON.stringify(value)).digest('hex');
const shaPattern = /^[a-f0-9]{40}$/;

export function readLock(text) {
    const entries = text.trim().split('\n').map((line) => line.trim().split(' '));
    if (entries.some(([path, sha, extra]) => !path || !shaPattern.test(sha) || extra)
        || new Set(entries.map(([path]) => path)).size !== entries.length
        || entries[0][0] !== 'infrastructure') {
        throw new Error('Invalid source lock.');
    }
    return Object.fromEntries(entries);
}

export function sourceReader(root, lock) {
    const projects = Object.keys(lock).filter((name) => name !== 'infrastructure').sort((a, b) => b.length - a.length);
    const cache = new Map();
    return (path) => {
        if (cache.has(path)) return cache.get(path);
        const project = projects.find((name) => path === name || path.startsWith(`${name}/`));
        let content;
        if (project) {
            const relative = path === project ? '' : path.slice(project.length + 1);
            // ls-tree also represents intentionally absent Gradle files without masking Git errors.
            content = execFileSync('git', ['-C', resolve(root, project), 'ls-tree', lock[project], '--', relative || '.'], {encoding: 'utf8'});
        } else if (!existsSync(resolve(root, path)) || statSync(resolve(root, path)).isDirectory()) {
            // Libraries kept in the workspace repository are pinned by the infrastructure revision.
            content = execFileSync('git', ['-C', root, 'ls-tree', lock.infrastructure, '--', path], {encoding: 'utf8'});
        } else {
            content = readFileSync(resolve(root, path), 'utf8').replaceAll('\r\n', '\n');
        }
        const hash = createHash('sha1').update(content).digest('hex');
        cache.set(path, hash);
        return hash;
    };
}

export function fingerprints(read) {
    const tooling = digest(['tooling-v1', read('docker/ci/Dockerfile')]);
    const clients = Object.fromEntries(Object.entries(clientInputs).map(([name, inputs]) => [name,
        digest(['clients-v1', tooling, read('ci/build-clients.sh'), ...inputs.map(read)]),
    ]));
    const images = Object.fromEntries(services.map((service) => [service.name, digest([
        'image-v1', service.name, read(service.dockerfile),
        ...(service.kind === 'storage' ? [] : [read(`${service.dockerfile}.dockerignore`), tooling, read(`ci/build-${service.kind}.sh`)]),
        ...(service.kind === 'backend' ? [read('scripts/check-persistence.mjs')] : []),
        ...service.inputs.map(read),
        ...(service.clients ?? []).map((name) => clients[name]),
    ])]));
    return {tooling, clients, images};
}

export function registryContains(image, run = spawnSync) {
    const result = run('docker', ['buildx', 'imagetools', 'inspect', '--raw', image], {encoding: 'utf8', timeout: 60000});
    if (result.error) throw result.error;
    if (result.status === 0) return true;
    const detail = (result.stderr ?? '').trim().replace(/^ERROR: /, '');
    if (/^(?:manifest unknown|no such manifest)(?::[^\r\n]*)?$/i.test(detail)
        || detail === `${image}: not found`) return false;
    // Authentication, network and registry errors must never turn into a full rebuild.
    throw new Error(`Cannot inspect registry image ${image}: ${detail}`);
}

export function createPlan({keys, baseline, registry, contains, release, publish}) {
    if (!shaPattern.test(release)) throw new Error('Invalid release fingerprint.');
    if (!/^[a-zA-Z0-9_./:-]+$/.test(registry)) throw new Error('Invalid image registry prefix.');
    const reusable = baseline?.registry === registry ? baseline : {};
    const chooseTag = (key, previous) => previous?.key === key && shaPattern.test(previous.tag) ? previous.tag : key;
    const toolingTag = chooseTag(keys.tooling, reusable.tooling);
    const images = services.map((service) => {
        const key = keys.images[service.name];
        let tag = chooseTag(key, reusable.images?.[service.name]);
        let exists = contains(`${registry}/${service.name}:${tag}`);
        // If an old migration image was pruned, build its content-addressed replacement.
        if (!exists && tag !== key) {
            tag = key;
            exists = contains(`${registry}/${service.name}:${tag}`);
        }
        return {...service, key, tag, build: !exists};
    });
    const requiredClients = [...new Set(images.filter((service) => service.build).flatMap((service) => service.clients ?? []))];
    const clientKey = digest(requiredClients.map((name) => [name, keys.clients[name]]));
    const needsTooling = images.some((service) => service.build && service.kind !== 'storage');
    const toolingImage = `${registry}/ci:${toolingTag}`;
    return {
        release, publish, registry, images, clients: requiredClients, clientKey,
        toolingImage, buildTooling: needsTooling && !contains(toolingImage),
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = process.cwd();
    const lock = readLock(readFileSync('workspace.lock', 'utf8'));
    const keys = fingerprints(sourceReader(root, lock));
    const baseline = JSON.parse(readFileSync('ci/verified-images.json', 'utf8'));
    const release = execFileSync('git', ['hash-object', 'workspace.lock'], {encoding: 'utf8'}).trim();
    const publish = process.env.CI_PIPELINE_SOURCE === 'pipeline'
        ? process.env.UPSTREAM_RELEASE === 'true'
        : process.env.CI_COMMIT_BRANCH === process.env.CI_DEFAULT_BRANCH;
    const plan = createPlan({keys, baseline, registry: process.env.CI_REGISTRY_IMAGE, contains: registryContains, release, publish});
    writeFileSync('build-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
    writeFileSync('images.env', plan.images.map(({name, tag}) => `${imageVariable(name)}=${tag}\n`).join(''));
    writeFileSync('generated-pipeline.yml', `${JSON.stringify(generatePipeline(plan, readFileSync('workspace.lock', 'utf8')), null, 2)}\n`);
    console.log(`Build: ${plan.images.filter(({build}) => build).map(({name}) => name).join(', ') || 'none; verified images reused'}`);
}
