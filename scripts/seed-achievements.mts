import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
    Configuration as IdConfiguration,
    IdApi,
} from '../backend/id/app/contract/client/typescript/.build/dist/index.js';
import {
    AchievementType,
    AchievementsApi,
    AdminApi,
    Configuration,
    type Achievement,
} from '../backend/person/app/contract/client/typescript/.build/dist/index.js';

const PAGE_SIZE = 50;
const TOKEN_LIFETIME_SECONDS = 600;
const ASSETS = new URL('../frontend/assets/achievements/', import.meta.url);

interface Definition {
    key: string;
    file: string;
    title: string;
    description: string;
    type: AchievementType;
    pageAgeYears?: number;
}

function environment(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required.`);
    }
    return value;
}

function serviceHeaders(secret: string): Record<string, string> {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
        iss: 'persons', sub: 'achievement-catalog-seed', aud: 'persons-internal', scope: 'service',
        iat: now, exp: now + TOKEN_LIFETIME_SECONDS, jti: randomUUID(),
    })}`;
    const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
    return {
        'X-Service-Authorization': `Bearer ${unsigned}.${signature}`,
        'X-Client-Origin': 'achievement-catalog-seed',
        'User-Agent': 'Persons achievement catalog seed',
    };
}

async function list(api: AchievementsApi): Promise<Achievement[]> {
    const first = await api.listAchievements({ page: 0, size: PAGE_SIZE });
    const remaining = await Promise.all(Array.from(
        { length: Math.max(0, Math.ceil(first.total / PAGE_SIZE) - 1) },
        (_, index) => api.listAchievements({ page: index + 1, size: PAGE_SIZE }),
    ));
    return first.items.concat(...remaining.map((page) => page.items));
}

function verifyDefinition(saved: Achievement, definition: Definition) {
    if (!saved.active || saved.description !== definition.description || saved.type !== definition.type ||
        saved.pageAgeYears !== definition.pageAgeYears) {
        throw new Error(`Existing achievement differs from the catalog: ${definition.key}. No existing definition was overwritten.`);
    }
}

async function seed() {
    const catalogs = await Promise.all(['anniversaries-and-habits.json', 'community-jokes.json'].map(async (file) =>
        JSON.parse(await readFile(new URL(file, ASSETS), 'utf8')) as { assets: Definition[] },
    ));
    const definitions = catalogs.flatMap((catalog) => catalog.assets);
    const headers = serviceHeaders(environment('PROJECT_INTERNAL_JWT_SECRET'));
    const idUrl = environment('SEED_ID_URL');
    const personUrl = environment('SEED_PERSON_URL');
    const login = new IdApi(new IdConfiguration({ basePath: idUrl, headers }));
    const session = await login.createSession({ credentials: {
        email: environment('SEED_EMAIL'), password: environment('SEED_PASSWORD'),
    } });
    const id = new IdApi(new IdConfiguration({ basePath: idUrl, headers, accessToken: session.token }));
    const configuration = new Configuration({ basePath: personUrl, headers, accessToken: session.token });
    const api = new AchievementsApi(configuration);
    const admin = new AdminApi(configuration);

    try {
        const beforePersons = await admin.listAdminPersons({ page: 0, size: 1 });
        const existing = await list(api);
        const images = await Promise.all(definitions.map(async (definition) => ({
            definition, bytes: await readFile(new URL(definition.file, ASSETS)),
        })));
        // Validate the whole existing catalog before adding any missing definitions.
        images.forEach(({ definition }) => {
            const matches = existing.filter((item) => item.title === definition.title);
            if (matches.length > 1) {
                throw new Error(`Ambiguous existing title: ${definition.key}.`);
            }
            if (matches[0]) {
                verifyDefinition(matches[0], definition);
            }
        });
        let created = 0;
        const records: { key: string; id: string; type: AchievementType }[] = [];
        for (const { definition, bytes } of images) {
            const previous = existing.find((item) => item.title === definition.title);
            const saved = previous ?? await api.createAchievement({
                title: definition.title, description: definition.description,
                type: definition.type, pageAgeYears: definition.pageAgeYears,
                file: new Blob([bytes], { type: 'image/png' }),
            });
            if (!previous) {
                created += 1;
            }
            verifyDefinition(saved, definition);
            const image = Buffer.from(await (await api.readAchievementImage({ id: saved.id })).arrayBuffer());
            if (createHash('sha256').update(bytes).digest('hex') !== createHash('sha256').update(image).digest('hex')) {
                throw new Error(`Uploaded image differs: ${definition.key}.`);
            }
            records.push({ key: definition.key, id: saved.id, type: saved.type });
        }
        const afterPersons = await admin.listAdminPersons({ page: 0, size: 1 });
        if (afterPersons.total !== beforePersons.total) {
            throw new Error('Persona count changed during the import. Check concurrent administration.');
        }
        console.log(JSON.stringify({ verified: true, created, alreadyPresent: records.length - created, personas: afterPersons.total, records }));
    } finally {
        const current = (await id.listSessions()).items.find((item) => item.current);
        if (current) {
            await id.revokeSession({ id: current.id });
        }
    }
}

seed().catch((error: unknown) => {
    const status = error && typeof error === 'object' && 'response' in error && error.response instanceof Response
        ? error.response.status : undefined;
    console.error('Achievement catalog import failed.', status ? `HTTP ${status}.` : '',
        error instanceof Error && !status ? error.message : 'Check the target service and its logs.');
    process.exitCode = 1;
});
