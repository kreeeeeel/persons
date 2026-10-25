import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { userInfo } from 'node:os';
import path from 'node:path';

const COMMAND_ARGUMENT_INDEX = 2;
const SIGINT = 'SIGINT';
const SIGTERM = 'SIGTERM';
const FAILURE_EXIT_CODE = 1;

const require = createRequire(import.meta.url);
const env = { ...process.env };

if (process.platform === 'win32' && !env.SWC_NATIVE_BINDING_CACHE) {
    const cache = path.join(env.ProgramData ?? 'C:/ProgramData', 'PersonsBuildCache', userInfo().username, 'swc');

    await mkdir(cache, { recursive: true });
    env.SWC_NATIVE_BINDING_CACHE = cache;
}

const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), ...process.argv.slice(COMMAND_ARGUMENT_INDEX)],
    {
        stdio: 'inherit',
        env,
    },
);
process.on(SIGINT, () => child.kill(SIGINT));
process.on(SIGTERM, () => child.kill(SIGTERM));
child.on('exit', (code) => process.exit(code ?? FAILURE_EXIT_CODE));
