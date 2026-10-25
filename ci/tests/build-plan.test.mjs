import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPlan, fingerprints, readLock, sourceReader} from '../build-plan.mjs';
import {generatePipeline} from '../generate-pipeline.mjs';

const revision = 'a'.repeat(40);
const registry = 'registry.example.test/team/project';
const read = (...changed) => (path) => changed.some((name) => name === path || name.startsWith(`${path}/`)) ? `${path}:changed` : path;
const original = fingerprints(read());
const affected = (...changed) => {
    const next = fingerprints(read(...changed));
    return Object.keys(next.images).filter((name) => next.images[name] !== original.images[name]);
};
const baseline = {
    registry, tooling: {key: original.tooling, tag: revision},
    images: Object.fromEntries(Object.entries(original.images).map(([name, key]) => [name, {key, tag: revision}])),
};
const plan = (options = {}) => createPlan({keys: original, baseline, registry, release: revision, publish: true, contains: () => true, ...options});

test('a public frontend change rebuilds only that application', () => {
    assert.deepEqual(affected('frontend/person/src/app/page.tsx'), ['person-web']);
    assert.deepEqual(affected('frontend/id/src/app/page.tsx'), ['id-web']);
    assert.deepEqual(affected('frontend/person-admin/src/app/page.tsx'), ['person-admin-web']);
});

test('shared frontend libraries fan out to their consumers without backend/storage', () => {
    assert.deepEqual(affected('frontend/libs/theme/src/theme.css'), ['id-web', 'person-web', 'person-admin-web']);
    assert.deepEqual(affected('frontend/libs/person-domain/src/person.ts'), ['person-web', 'person-admin-web']);
});

test('server implementation changes do not rebuild frontend clients', () => {
    assert.deepEqual(affected('backend/id/app/api/src/main/Service.kt'), ['id']);
    assert.deepEqual(affected('backend/person/app/api/src/main/Service.kt'), ['person']);
    assert.deepEqual(affected('backend/mail/app/api/src/main/Service.kt'), ['mail']);
});

test('Leetify library changes rebuild the person API and worker only', () => {
    assert.deepEqual(affected('backend/libs/lettify-integration/src/main/kotlin/Client.kt'), ['person', 'person-worker']);
});

test('contract and transitive Kotlin dependencies invalidate their consumers', () => {
    assert.deepEqual(affected('backend/id/app/contract/api/schema/api.yaml'), ['id', 'person', 'person-worker', 'restrictions', 'gateway', 'id-web', 'person-web', 'person-admin-web']);
    assert.deepEqual(affected('backend/person/app/contract/api/schema/api.yaml'), ['person', 'gateway', 'person-web', 'person-admin-web']);
    assert.deepEqual(affected('backend/libs/id-context/src/main/Session.kt'), ['id', 'person', 'person-worker', 'restrictions', 'gateway']);
    assert.deepEqual(affected('backend/person/app/maintenance/src/main/Job.kt'), ['person', 'person-worker']);
    assert.deepEqual(affected('backend/mail/app/contract/api/schema/api.yaml'), ['id', 'mail']);
    assert.deepEqual(affected('backend/id/gradlew'), ['id', 'person', 'person-worker', 'restrictions', 'gateway', 'id-web', 'person-web', 'person-admin-web']);
});

test('restriction implementation is isolated while its contract reaches gateway and worker', () => {
    assert.deepEqual(affected('backend/restrictions/app/api/src/main/Service.kt'), ['restrictions']);
    assert.deepEqual(affected('backend/restrictions/app/contract/api/schema/api.yaml'), ['person-worker', 'restrictions', 'gateway']);
    assert.deepEqual(affected('backend/gateway/app/api/src/main/Policy.kt'), ['gateway']);
});

test('storage server is independent of frontend assets and application changes', () => {
    assert.deepEqual(affected('frontend/assets/logo.svg'), ['id-web', 'person-web', 'person-admin-web', 'assets']);
    assert.deepEqual(affected('docker/minio/Dockerfile.server'), ['minio']);
    assert.deepEqual(affected('docker/minio/initialize.sh'), ['assets']);
    assert.deepEqual(affected('docs/deployment/ru.md'), []);
});

test('tooling/build recipe changes invalidate only relevant builds', () => {
    assert.equal(affected('docker/ci/Dockerfile').length, 10);
    assert.deepEqual(affected('ci/build-frontend.sh'), ['id-web', 'person-web', 'person-admin-web']);
    assert.deepEqual(affected('ci/build-backend.sh'), ['id', 'mail', 'i18n', 'person', 'person-worker', 'restrictions', 'gateway']);
});

test('verified existing images are reused and the cache-hit pipeline remains valid', () => {
    const result = plan();
    assert.equal(result.images.filter(({build}) => build).length, 0);
    assert.equal(result.buildTooling, false);
    assert.deepEqual(result.clients, []);
    const pipeline = generatePipeline(result);
    assert.ok(pipeline.summary);
    assert.ok(pipeline.deploy);
    assert.equal(pipeline.storage, undefined);
    assert.equal(pipeline.clients, undefined);
    assert.equal(Object.keys(pipeline).filter((name) => name.startsWith('check:') || name.startsWith('publish:')).length, 0);
});

test('frontend-only pipeline generates cached clients without building any backend or MinIO', () => {
    const keys = fingerprints(read('frontend/person/src/page.tsx'));
    const result = plan({keys, contains: (image) => image.endsWith(`:${revision}`)});
    const pipeline = generatePipeline(result);
    assert.deepEqual(result.images.filter(({build}) => build).map(({name}) => name), ['person-web']);
    assert.deepEqual(result.clients, ['id', 'i18n', 'person', 'dynamic-properties']);
    assert.ok(pipeline.clients);
    assert.ok(pipeline['check:person-web']);
    assert.ok(pipeline['publish:person-web']);
    assert.equal(pipeline['check:person'], undefined);
    assert.equal(pipeline['publish:minio'], undefined);
    assert.equal(pipeline.storage, undefined);
    assert.deepEqual(pipeline['publish:person-web'].needs.filter(({job}) => job?.startsWith('check:')).map(({job}) => job), ['check:person-web']);
});

test('empty registry produces a complete bootstrap; branch pipelines cannot publish or deploy', () => {
    const result = plan({contains: () => false, publish: false});
    assert.equal(result.images.filter(({build}) => build).length, 12);
    assert.equal(result.buildTooling, true);
    const pipeline = generatePipeline(result);
    assert.ok(pipeline['check:libs/id-context']);
    assert.ok(pipeline['check:libs/request-observability']);
    assert.equal(pipeline.deploy, undefined);
    assert.equal(Object.keys(pipeline).some((name) => name.startsWith('publish:')), false);
    assert.equal(pipeline['check:person-worker'].extends, '.worker-backend');
    assert.equal(pipeline['check:restrictions'].extends, '.restrictions-backend');
    assert.equal(pipeline['check:person'].extends, '.backend');
});

test('missing migration images fall back to immutable input hashes; another registry cannot reuse baseline', () => {
    const result = plan({contains: () => false});
    assert.ok(result.images.every(({tag, key}) => tag === key));
    assert.ok(plan({registry: 'registry.other.test/project'}).images.every(({tag, key}) => tag === key));
    const pipeline = generatePipeline(result);
    assert.ok(pipeline.storage);
    assert.equal(pipeline.storage.variables.MINIO_BUILT, 'true');
    assert.equal(pipeline.storage.variables.ASSETS_BUILT, 'true');
    assert.ok(pipeline.deploy.needs.some(({job}) => job === 'storage'));
});

test('source lock and image manifest are embedded literally without paid cross-pipeline artifact dependencies', () => {
    const lock = `infrastructure ${revision}\n`;
    const pipeline = generatePipeline(plan(), lock);
    assert.equal(pipeline.variables.WORKSPACE_LOCK, lock);
    assert.ok(pipeline.variables.IMAGE_MANIFEST.includes(`PERSON_WEB_IMAGE_TAG=${revision}\n`));
    assert.ok(Object.values(pipeline).every((job) => !job?.needs?.some((need) => need.pipeline)));
});

test('source locks reject malformed and duplicate revisions', () => {
    assert.throws(() => readLock('infrastructure invalid\n'));
    assert.throws(() => readLock(`infrastructure ${revision}\ninfrastructure ${revision}\n`));
    assert.deepEqual(readLock(`infrastructure ${revision}\nbackend/id ${revision}\n`), {infrastructure: revision, 'backend/id': revision});
});

test('fingerprints read the locked Git revision rather than a dirty checkout; CRLF is normalized', () => {
    const directory = mkdtempSync(join(tmpdir(), 'persons-inputs-'));
    try {
        const child = join(directory, 'frontend/person');
        mkdirSync(child, {recursive: true});
        const git = (...args) => execFileSync('git', ['-C', child, ...args], {encoding: 'utf8'}).trim();
        git('init', '--quiet');
        git('config', 'user.name', 'CI Fixture');
        git('config', 'user.email', 'ci@example.test');
        writeFileSync(join(child, 'source.txt'), 'original\n');
        git('add', '.');
        git('commit', '--quiet', '-m', 'Fixture');
        const locked = git('rev-parse', 'HEAD');
        const first = sourceReader(directory, {'frontend/person': locked});
        const before = first('frontend/person');
        writeFileSync(join(child, 'source.txt'), 'dirty\n');
        assert.equal(sourceReader(directory, {'frontend/person': locked})('frontend/person'), before);
        writeFileSync(join(directory, 'recipe'), 'first\r\nsecond\r\n');
        const windows = sourceReader(directory, {})('recipe');
        writeFileSync(join(directory, 'recipe'), 'first\nsecond\n');
        assert.equal(sourceReader(directory, {})('recipe'), windows);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});
