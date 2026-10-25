import { createHash } from 'node:crypto';
import {
    createServer,
    request as httpRequest,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { proxyMediaUpload } from '@persons/person-domain/api/proxyMediaUpload';
import { maxMediaUploadRequestBytes } from '@persons/person-domain/media/uploadLimits';

vi.mock('server-only', () => ({}));

const id = 'b4b00d6a-e38b-4d16-820c-80209aecfb15';
const servers: Server[] = [];
const config = {
    personUrl: '',
    publicUrl: 'https://people.example',
    serviceToken: 'service-secret',
    sessionToken: 'private-session' as string | undefined,
};

async function listen(handler: (request: IncomingMessage, response: ServerResponse) => void) {
    const server = createServer(handler);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function send(
    url: string,
    headers: Record<string, string | undefined> = {},
    chunks = [Buffer.from('--test--\r\n')],
    method = 'POST',
) {
    return new Promise<{ status: number; body: string; headers: IncomingMessage['headers'] }>((resolve, reject) => {
        const request = httpRequest(
            `${url}/upload`,
            {
                method,
                headers: { origin: config.publicUrl, 'content-type': 'multipart/form-data; boundary=test', ...headers },
            },
            (response) => {
                const body: Buffer[] = [];
                response.on('data', (chunk: Buffer) => body.push(chunk));
                response.on('end', () =>
                    resolve({
                        status: response.statusCode!,
                        body: Buffer.concat(body).toString(),
                        headers: response.headers,
                    }),
                );
            },
        );
        request.on('error', reject);
        void pipeline(Readable.from(chunks), request).catch((error: NodeJS.ErrnoException) => {
            // An early HTTP rejection can close the upload while its producer is still writing.
            if (error.code !== 'EPIPE' && error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                reject(error);
            }
        });
    });
}

afterEach(async () => {
    await Promise.all(
        servers.splice(0).map(
            (server) =>
                new Promise<void>((resolve, reject) => {
                    server.closeAllConnections();
                    server.close((error) => (error ? reject(error) : resolve()));
                }),
        ),
    );
    vi.restoreAllMocks();
});

it.each(['', '/person', '/person/'])(
    'streams a large multipart body preserving the backend base path %j, bytes and only trusted headers',
    async (basePath) => {
        const chunk = Buffer.alloc(64 * 1024, 37);
        const chunks = Array.from({ length: 192 }, () => chunk);
        const expected = createHash('sha256').update(Buffer.concat(chunks)).digest('hex');
        let received = '';
        let receivedPath: string | undefined;
        const backend = await listen(async (request, response) => {
            receivedPath = request.url;
            expect(request.headers.authorization).toBe('Bearer private-session');
            expect(request.headers['x-service-authorization']).toBe('Bearer service-secret');
            expect(request.headers.cookie).toBeUndefined();
            expect(request.headers['content-type']).toBe('multipart/form-data; boundary=test');
            const hash = createHash('sha256');
            for await (const bytes of request) {
                hash.update(bytes);
            }
            received = hash.digest('hex');
            response.writeHead(202, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ status: 'PENDING' }));
        });
        const proxy = await listen((request, response) => {
            void proxyMediaUpload(request, response, id, { ...config, personUrl: backend + basePath });
        });
        const result = await send(proxy, { cookie: 'untrusted-cookie' }, chunks);
        expect(result.status).toBe(202);
        expect(JSON.parse(result.body)).toEqual({ status: 'PENDING' });
        expect(result.headers['cache-control']).toBe('private, no-store');
        expect(received).toBe(expected);
        expect(receivedPath).toBe(`${basePath.replace(/\/$/, '')}/v1/persons/${id}/media`);
    },
);

it.each([
    { status: 403, headers: { origin: 'https://foreign.example' } },
    { status: 401, sessionToken: undefined },
    { status: 400, headers: { 'content-type': 'application/json' } },
    { status: 413, headers: { 'content-length': String(maxMediaUploadRequestBytes + 1) } },
    { status: 404, personId: 'invalid' },
    { status: 405, method: 'GET' },
])('rejects invalid upload metadata before contacting the backend: $status', async (test) => {
    const proxy = await listen((request, response) => {
        void proxyMediaUpload(request, response, test.personId ?? id, {
            ...config,
            personUrl: 'http://127.0.0.1:1',
            sessionToken: 'sessionToken' in test ? test.sessionToken : config.sessionToken,
        });
    });
    expect((await send(proxy, test.headers, undefined, test.method)).status).toBe(test.status);
});

it('enforces the byte limit for chunked uploads without buffering their contents', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const backend = await listen((request) => request.on('data', () => undefined));
    const proxy = await listen((request, response) => {
        void proxyMediaUpload(request, response, id, { ...config, personUrl: backend });
    });
    const chunk = Buffer.alloc(1024 * 1024);
    const result = await send(
        proxy,
        {},
        Array.from({ length: Math.ceil(maxMediaUploadRequestBytes / chunk.length) + 1 }, () => chunk),
    );
    expect(result.status).toBe(413);
    expect(JSON.parse(result.body)).toEqual({ code: 'UPLOAD_TOO_LARGE' });
}, 20000);

it.each([302, 500])('normalizes an unexpected upstream response without leaking its body: %i', async (status) => {
    const backend = await listen((request, response) => {
        request.resume();
        response.writeHead(status, { 'Content-Type': 'text/html' });
        response.end('private upstream details');
    });
    const proxy = await listen((request, response) => {
        void proxyMediaUpload(request, response, id, { ...config, personUrl: backend });
    });
    const result = await send(proxy);
    expect(result.status).toBe(status === 302 ? 502 : 500);
    expect(JSON.parse(result.body)).toEqual({ code: 'UNAVAILABLE' });
});
