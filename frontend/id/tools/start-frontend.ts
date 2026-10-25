import { cp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const SIGINT = 'SIGINT';
const SIGTERM = 'SIGTERM';
const FAILURE_EXIT_CODE = 1;

const root = path.resolve(import.meta.dirname, '..');
const server = path.join(root, '.next/standalone/frontend/id/server.js');
await cp(path.join(root, '.next/static'), path.join(root, '.next/standalone/frontend/id/.next/static'), {
    recursive: true,
});
await cp(path.join(root, 'public'), path.join(root, '.next/standalone/frontend/id/public'), {
    recursive: true,
});

const child = spawn(process.execPath, [server], {
    stdio: 'inherit',
    env: { ...process.env, HOSTNAME: '0.0.0.0' },
});

process.on(SIGINT, () => child.kill(SIGINT));
process.on(SIGTERM, () => child.kill(SIGTERM));
child.on('exit', (code) => process.exit(code ?? FAILURE_EXIT_CODE));
