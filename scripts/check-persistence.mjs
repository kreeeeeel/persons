import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../backend/', import.meta.url));
const excluded = new Set(['.git', '.build', '.gradle', 'build', 'node_modules']);
const forbidden = /\b(?:NamedParameterJdbcTemplate|JdbcTemplate|JdbcClient|createNativeQuery|DriverManager)\b|nativeQuery\s*=\s*true|\.(?:prepareStatement|createStatement)\s*\(/;

async function inspect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const results = await Promise.all(entries.filter((entry) => !excluded.has(entry.name)).map(async (entry) => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return inspect(file);
        if (!/\.(kt|java)$/.test(file)) return [];
        const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
        return lines.flatMap((line, index) => forbidden.test(line) ? [`${file}:${index + 1}`] : []);
    }));
    return results.flat();
}

const violations = await inspect(root);
if (violations.length) {
    throw new Error(`Use Spring Data JPA / Criteria API for backend persistence:\n${violations.join('\n')}`);
}
console.log('Backend persistence: Spring Data JPA / Criteria API check passed.');
