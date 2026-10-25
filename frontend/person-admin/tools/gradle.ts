import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { userInfo } from 'node:os';
import path from 'node:path';

const TASK_ARGUMENT_INDEX = 2;
const FAILURE_EXIT_CODE = 1;
const SUCCESS_EXIT_CODE = 0;

const env = { ...process.env };
const task = process.argv[TASK_ARGUMENT_INDEX] ?? 'build';

if (!['build', 'generateClients', 'ktlintFormat', 'test', 'bootJar'].includes(task)) {
    throw new Error('Unsupported Gradle task');
}

if (process.platform === 'win32') {
    const temporary = path.join(env.ProgramData ?? 'C:/ProgramData', 'PersonsBuildCache', userInfo().username, 'java');

    await mkdir(temporary, { recursive: true });
    env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS ?? ''} -Djdk.net.unixdomain.tmpdir="${temporary}"`;
}

const backend = path.resolve(import.meta.dirname, '../../../backend');
const projects =
    task === 'generateClients'
        ? ['id', 'i18n', 'person-admin', 'person']
        : ['id', 'i18n', 'mail', 'person-admin', 'person', 'libs/id-context', 'libs/request-observability'];
for (const project of projects) {
    const args = ['--no-daemon', '--max-workers=2', task === 'bootJar' ? ':app:api:bootJar' : task];
    const command = process.platform === 'win32' ? 'cmd.exe' : './gradlew';
    const commandArgs = process.platform === 'win32' ? ['/d', '/c', 'gradlew.bat', ...args] : args;
    const code = await new Promise<number>((resolve, reject) => {
        const child = spawn(command, commandArgs, {
            cwd: path.join(backend, project),
            stdio: 'inherit',
            env,
        });

        child.on('error', reject);
        child.on('exit', (status) => resolve(status ?? FAILURE_EXIT_CODE));
    });

    if (code !== SUCCESS_EXIT_CODE) {
        process.exit(code);
    }
}
