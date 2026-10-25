import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

test('external S3 config replaces application storage and leaves only assets publicly addressable', () => {
    const directory = mkdtempSync(join(tmpdir(), 'persons-external-s3-test-'));
    const fixture = join(directory, 'fixture.env');
    try {
        const values = {
            DB_PASSWORD: 'fixture-database-password',
            MINIO_ROOT_USER: 'fixture-storage-user',
            MINIO_ROOT_PASSWORD: 'fixture-storage-password',
            PROJECT_INTERNAL_JWT_SECRET: 'fixture-internal-secret-at-least-thirty-two-characters',
            PROJECT_GATEWAY_JWT_SECRET: 'fixture-gateway-secret-at-least-thirty-two-characters',
            REDIS_PASSWORD: 'fixture-cache-password',
            ID_PEPPER: 'fixture-pepper-at-least-thirty-two-characters',
            ID_JWT_SECRET: 'fixture-id-secret-at-least-thirty-two-characters',
            IMAGE_PREFIX: 'registry.example.test/people', RELEASE_SHA: 'a'.repeat(40),
            PUBLIC_ID_URL: 'https://id.people.test', PUBLIC_PERSON_URL: 'https://people.test',
            PUBLIC_ADMIN_URL: 'https://cms.people.test', SESSION_COOKIE_DOMAIN: 'people.test',
            SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', MAIL_FROM: 'noreply@people.test',
            S3_ENDPOINT: 'https://storage.example.test', S3_REGION: 'default', S3_BUCKET: 'people-bucket',
            S3_ACCESS_KEY: 'fixture-access', S3_SECRET_KEY: 'fixture-secret',
            ASSET_BASE_URL: 'https://storage.example.test/people-bucket/assets',
        };
        writeFileSync(fixture, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'));
        const output = execFileSync('docker', [
            'compose', '--env-file', fixture, '-f', 'docker-compose.yaml',
            '-f', 'docker/compose.production.yaml', '-f', 'docker/compose.external-s3.yaml',
            'config', '--format', 'json',
        ], {encoding: 'utf8', env: {...process.env, ...values}});
        const {services} = JSON.parse(output);
        for (const name of ['id', 'person', 'person-worker', 'minio-init']) {
            assert.equal(services[name].environment.S3_ENDPOINT, values.S3_ENDPOINT);
            assert.equal(services[name].environment.S3_BUCKET, values.S3_BUCKET);
            assert.equal(services[name].environment.S3_ACCESS_KEY, values.S3_ACCESS_KEY);
            assert.equal(services[name].environment.S3_SECRET_KEY, values.S3_SECRET_KEY);
            assert.equal(services[name].depends_on?.minio, undefined);
        }
        for (const name of ['id-web', 'person-web', 'person-admin-web']) {
            assert.equal(services[name].environment.ASSET_BASE_URL, values.ASSET_BASE_URL);
            assert.equal(services[name].environment.ID_BASE_URL, 'http://gateway:8087/id');
            assert.equal(services[name].environment.PROJECT_GATEWAY_JWT_SECRET, undefined);
            assert.equal(services[name].environment.REDIS_PASSWORD, undefined);
        }
        for (const name of ['person-web', 'person-admin-web']) {
            assert.equal(services[name].environment.PERSON_BASE_URL, 'http://gateway:8087/person');
        }
        assert.equal(services.restrictions.environment.DB_URL.split('?')[0], 'jdbc:postgresql://postgres:5432/restrictions');
        assert.ok(!services.redis.ports?.length);
        assert.equal(services.minio, undefined);
        assert.equal(services.id.environment.DB_URL, 'jdbc:postgresql://postgres:5432/id');
        assert.equal(services.person.environment.DB_URL, 'jdbc:postgresql://postgres:5432/person');
    } finally {
        assert.ok(resolve(directory).startsWith(resolve(tmpdir(), 'persons-external-s3-test-')));
        rmSync(directory, {recursive: true});
    }
});
