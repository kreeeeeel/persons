import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../../scripts/ssh-server-first.sh', import.meta.url));

test('SSH proxy forwards both directions before the client closes its input', {skip: process.platform === 'win32'}, async () => {
    const received = [];
    const server = createServer((socket) => {
        socket.write('SSH-2.0-test-server\r\n');
        socket.on('data', (data) => {
            received.push(data.toString());
            if (received.join('').includes('client-data')) socket.end('server-data');
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const child = spawn('bash', [script, '127.0.0.1', String(server.address().port)]);
    let output = '';
    let timedOut = false;
    child.stdout.on('data', (data) => {
        output += data;
        if (output.endsWith('server-data')) child.stdin.end();
    });
    child.stdin.write('client-data');
    const watchdog = setTimeout(() => {
        timedOut = true;
        child.stdin.end();
    }, 5000);
    try {
        const code = await new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', resolve);
        });
        assert.equal(code, 0);
        assert.equal(timedOut, false, 'The stream must forward data without waiting for EOF');
        assert.equal(output, 'SSH-2.0-test-server\r\nserver-data');
        assert.equal(received.join(''), 'client-data');
    } finally {
        clearTimeout(watchdog);
        child.kill();
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
    }
});

test('SSH proxy rejects shell metacharacters without connecting', {skip: process.platform === 'win32'}, async () => {
    const child = spawn('bash', [script, 'invalid;host', '22']);
    const code = await new Promise((resolve) => child.on('exit', resolve));
    assert.equal(code, 2);
});

test('SSH proxy retries a silent identification connection before sending any client data', {skip: process.platform === 'win32', timeout: 20000}, async () => {
    const sockets = new Set();
    let attempts = 0;
    let silentConnectionData = '';
    const server = createServer((socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        attempts += 1;
        if (attempts === 1) {
            socket.on('data', (data) => { silentConnectionData += data; });
        } else {
            socket.write('SSH-2.0-retried-server\r\n');
            socket.on('data', () => socket.end('connected'));
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const child = spawn('bash', [script, '127.0.0.1', String(server.address().port)]);
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stdin.end('client-data');
    try {
        const code = await new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', resolve);
        });
        assert.equal(code, 0);
        assert.equal(attempts, 2);
        assert.equal(silentConnectionData, '');
        assert.equal(output, 'SSH-2.0-retried-server\r\nconnected');
    } finally {
        child.kill();
        sockets.forEach((socket) => socket.destroy());
        await new Promise((resolve) => server.close(resolve));
    }
});

test('SSH proxy stops after three peers close before identification', {skip: process.platform === 'win32'}, async () => {
    let attempts = 0;
    const server = createServer((socket) => {
        attempts += 1;
        socket.end();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const child = spawn('bash', [script, '127.0.0.1', String(server.address().port)]);
    child.stdin.end('must-not-be-forwarded');
    try {
        const code = await new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', resolve);
        });
        assert.equal(code, 1);
        assert.equal(attempts, 3);
    } finally {
        child.kill();
        await new Promise((resolve) => server.close(resolve));
    }
});
