import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registryContains} from '../build-plan.mjs';

const image = 'registry.example.test/team/project/i18n:release';
const result = (stderr, status = 1) => ({status, stderr, stdout: ''});

test('inspects the original registry manifest with buildx and the bounded timeout', () => {
    const manifest = JSON.stringify({schemaVersion: 2, mediaType: 'application/vnd.docker.distribution.manifest.v2+json'});
    assert.equal(registryContains(image, (command, args, options) => {
        assert.equal(command, 'docker');
        assert.deepEqual(args, ['buildx', 'imagetools', 'inspect', '--raw', image]);
        assert.deepEqual(options, {encoding: 'utf8', timeout: 60000});
        return {...result('', 0), stdout: manifest};
    }), true);
});

test('only explicit missing manifests and the requested image not found are cache misses', () => {
    [
        'manifest unknown: manifest unknown',
        `no such manifest: ${image}`,
        'ERROR: manifest unknown: manifest unknown\n',
        `ERROR: ${image}: not found\n`,
    ].forEach((stderr) => assert.equal(registryContains(image, () => result(stderr)), false));
});

test('authentication and authorization errors stop planning', () => {
    [
        'ERROR: unauthorized: authentication required',
        'ERROR: unexpected status from HEAD request: 403 Forbidden',
        'ERROR: failed to authorize: no such manifest: authentication service unavailable',
    ].forEach((stderr) => assert.throws(() => registryContains(image, () => result(stderr)), /Cannot inspect registry image/));
});

test('network failures and unrelated not found errors stop planning', () => {
    [
        'ERROR: failed to do request: dial tcp: lookup registry.example.test: no such host',
        'ERROR: failed to fetch anonymous token: token service: not found',
        'ERROR: registry.other.test/team/project/i18n:release: not found',
        `ERROR: ${image}: not found\nERROR: connection reset by peer`,
    ].forEach((stderr) => assert.throws(() => registryContains(image, () => result(stderr)), /Cannot inspect registry image/));
});

test('propagates command timeouts instead of reporting a cache miss', () => {
    const timeout = Object.assign(new Error('spawnSync docker ETIMEDOUT'), {code: 'ETIMEDOUT'});
    assert.throws(() => registryContains(image, () => ({...result(''), status: null, error: timeout})), (error) => error === timeout);
});

test('unsupported formats fail closed even when the command also prints valid manifest JSON', () => {
    const failure = {
        ...result('ERROR: unsupported manifest format'),
        stdout: JSON.stringify({schemaVersion: 2, mediaType: 'application/vnd.docker.distribution.manifest.v2+json'}),
    };
    assert.throws(() => registryContains(image, () => failure), /unsupported manifest format/);
});
