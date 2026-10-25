import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Configuration as IdConfiguration, IdApi } from '../backend/id/app/contract/client/typescript/.build/dist/index.js';
import { Configuration, PersonsApi, InteractionsApi, MediaApi, AdminApi } from '../backend/person/app/contract/client/typescript/.build/dist/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
process.loadEnvFile('.env');
const ACCOUNT_FILE = '.build/person-demo-account.json';
const STATE_FILE = '.build/person-demo-state.json';
const ACCOUNT_ID = 'e4b79553-adad-4386-a195-9b1451227ec6';
const EMAIL = 'demo@persons.local';
const DB = ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'persons', '-d', 'id', '-v', 'ON_ERROR_STOP=1', '-qAt'];
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

function sql(statement) {
    try { return execFileSync('docker', DB, { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
    catch { throw new Error('Demo database operation failed. Existing accounts were not replaced.'); }
}

await mkdir('.build', { recursive: true });
let account;
try { account = JSON.parse(await readFile(ACCOUNT_FILE, 'utf8')); }
catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (sql(`SELECT count(*) FROM accounts WHERE id=${sqlLiteral(ACCOUNT_ID)} OR email=${sqlLiteral(EMAIL)};`) !== '0') {
        throw new Error(`The demo account already exists. Restore ${ACCOUNT_FILE} or use normal password recovery.`);
    }
    account = { email: EMAIL, password: `Friends!${randomBytes(18).toString('base64url')}`, role: 'ADMIN' };
    await writeFile(ACCOUNT_FILE, JSON.stringify(account, null, 2) + '\n', { mode: 0o600 });
}

sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO accounts(id,email,first_name,last_name,locale,password_hash,failed_logins,created_at,version,role,status)
VALUES(${sqlLiteral(ACCOUNT_ID)},${sqlLiteral(EMAIL)},'Крел','Демо','ru',crypt(${sqlLiteral(account.password)},gen_salt('bf',12)),0,now(),0,'ADMIN','ACTIVE')
ON CONFLICT(id) DO NOTHING;`);

const secret = process.env.PROJECT_INTERNAL_JWT_SECRET;
if (!secret) throw new Error('PROJECT_INTERNAL_JWT_SECRET is required.');
function serviceToken() {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: 'persons', sub: 'demo-seed', aud: 'persons-internal', scope: 'service', iat: now, exp: now + 3600, jti: randomUUID() })).toString('base64url');
    return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
}
const headers = { 'X-Service-Authorization': `Bearer ${serviceToken()}`, 'X-Client-Origin': 'person-demo', 'User-Agent': 'Persons demo seed' };
const id = new IdApi(new IdConfiguration({ basePath: process.env.DEMO_ID_URL ?? 'http://localhost:8081', headers }));
const session = await id.createSession({ credentials: { email: account.email, password: account.password } });
const configuration = new Configuration({ basePath: process.env.DEMO_PERSON_URL ?? 'http://localhost:8087/person', accessToken: session.token, headers: { ...headers, Authorization: `Bearer ${session.token}` } });
const persons = new PersonsApi(configuration), interactions = new InteractionsApi(configuration), media = new MediaApi(configuration), admin = new AdminApi(configuration);
let state;
try { state = JSON.parse(await readFile(STATE_FILE, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; state = {}; }
const persist = () => writeFile(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
const approve = async (receipt) => admin.decideModeration({ id: receipt.id, decisionInput: { decision: 'APPROVE' } });
const options = [{ emoji: '💜', label: 'Свой человек' }, { emoji: '🔥', label: 'Легенда' }, { emoji: '🤝', label: 'Надёжный' }, { emoji: '🗿', label: 'Без комментариев' }];
const definitions = [
    { tag: 'krel', firstName: 'Крел', description: 'Собирает компанию, придумывает планы и иногда забывает, чья сейчас очередь. За хорошую игру и истории, которые остаются с нами.', tags: ['Душа компании', 'Настолки', 'Ещё одну партию'], socialLinks: [{ network: 'TELEGRAM', url: 'https://t.me/telegram' }, { network: 'STEAM', url: 'https://steamcommunity.com/about' }, { network: 'DISCORD', url: 'https://discord.com/app' }], photo: 'крел.png' },
    { tag: 'vadim', firstName: 'Вадим', description: 'Говорит «я на одну игру», а потом закрывает вечер последним.', tags: ['Всегда в игре', 'Свои'], photo: 'вадим.png' },
    { tag: 'tyamik', firstName: 'Тямик', description: 'У каждой партии есть неожиданный поворот. Обычно это Тямик.', tags: ['Неожиданный ход'], photo: 'тямик.png' },
    { tag: 'slava', firstName: 'Слава', description: '', tags: [], photo: 'слава.png' },
    { tag: 'artem', firstName: 'Артём', description: '', tags: [] },
];

async function upload(person, kind, file, caption, contentType) {
    const content = await readFile(file);
    const receipt = await media.uploadMedia({ id: person.id, kind, caption, file: new Blob([content], { type: contentType }) });
    await approve(receipt);
}

try {
    for (const definition of definitions) {
        const matches = await admin.listAdminPersons({ q: definition.tag, page: 0, size: 50 });
        if (!matches.items.some((item) => item.tag === definition.tag)) {
            await approve(await persons.createPerson({ profileInput: { tag: definition.tag, firstName: definition.firstName, lastName: '', description: definition.description, tags: definition.tags, socialLinks: definition.socialLinks ?? [], ratingOptions: definition.tag === 'artem' ? [options[0]] : options, version: 0 } }));
        }
        const person = await persons.getPerson({ tag: definition.tag });
        if (definition.photo && !person.avatarMediaId) {
            const directory = process.env.DEMO_FRIENDS_DIR ?? path.join(process.env.USERPROFILE ?? '', 'Desktop', 'люди');
            await upload(person, 'AVATAR', path.join(directory, definition.photo), '', 'image/png');
        }
        state[definition.tag] = person.id;
        await persist();
    }
    const full = await persons.getPerson({ tag: 'krel' });
    if (!state.linked) { await approve(await admin.linkAccount({ id: full.id, ownerLinkInput: { email: EMAIL } })); state.linked = true; await persist(); }
    if (!full.stats.photos) {
        const source = path.join(process.env.DEMO_FRIENDS_DIR ?? path.join(process.env.USERPROFILE ?? '', 'Desktop', 'люди'), 'крел.png');
        await upload(full, 'PHOTO', source, 'Тот самый человек из нашей компании', 'image/png');
    }
    if (process.env.DEMO_REFRESH_VIDEO === 'true') {
        const previous = await persons.listMoments({ id: full.id, page: 0, size: 50 });
        for (const item of previous.items.filter((item) => item.title === 'Ещё одна партия — иллюстрированный момент')) {
            await approve(await media.deleteMedia({ id: item.mediaId }));
        }
    }
    if (!(await persons.listMoments({ id: full.id, page: 0, size: 1 })).total) {
        await upload(full, 'MOMENT', '.build/demo-moment.mp4', 'Ещё одна партия — иллюстрированный момент', 'video/mp4');
    }
    if (!full.stats.comments) {
        await approve(await interactions.createComment({ id: full.id, commentInput: { text: 'Сказал «последняя партия» так убедительно, что мы сыграли ещё четыре. С ним любой вечер становится историей.' } }));
        await approve(await interactions.createComment({ id: full.id, commentInput: { text: 'Человек, который помнит правила. Или придумывает их достаточно уверенно 😄' } }));
    }
    if (!full.stats.creditEntries) {
        await approve(await interactions.createCredit({ id: full.id, creditInput: { kind: 'TRUST', description: 'Обещал собрать всех на выходных — собрал. Верим следующему приглашению.' } }));
        await approve(await interactions.createCredit({ id: full.id, creditInput: { kind: 'DOUBT', description: '«Я не буду брать ещё кусочек пиццы» — заявление требует повторной проверки.' } }));
    }
    await interactions.ratePerson({ id: full.id, ratingInput: { optionId: full.ratingOptions[0].id } });
    const moments = await persons.listMoments({ id: full.id, page: 0, size: 6 });
    if (moments.items[0]) {
        await interactions.likeMoment({ id: moments.items[0].id });
        if (!moments.items[0].comments) await approve(await interactions.createComment({ id: full.id, commentInput: { text: 'Этот раунд надо пересмотреть!', momentId: moments.items[0].id } }));
    }
    if (!state.rejected) {
        const receipt = await interactions.createComment({ id: state.vadim, commentInput: { text: 'Демонстрационная запись, которая не появится на стене.' } });
        await admin.decideModeration({ id: receipt.id, decisionInput: { decision: 'REJECT', reason: 'Это пример отклонённой записи. Можно написать новую историю.' } });
        state.rejected = true; await persist();
    }
    for (const [tag, kind, description] of [
        ['vadim', 'TRUST', 'Обещал прийти на одну партию и действительно пришёл. Своё слово держит.'],
        ['tyamik', 'DOUBT', 'Заявление «я точно помню правила» пока оставляем под вопросом.'],
    ]) {
        const person = await persons.getPerson({ tag });
        if (!person.stats.creditEntries) await approve(await interactions.createCredit({ id: person.id, creditInput: { kind, description } }));
    }
    if (!state.pending) {
        const receipt = await interactions.createComment({ id: state.vadim, commentInput: { text: 'Всегда готов поддержать компанию. Заявка ждёт решения модератора.' } });
        state.pending = receipt.id; await persist();
    }
    console.log(`Demo ready: /krel (full), /vadim and /tyamik (partial), /slava and /artem (empty). Credentials: ${ACCOUNT_FILE}`);
} finally {
    const authenticated = new IdApi(new IdConfiguration({ basePath: process.env.DEMO_ID_URL ?? 'http://localhost:8081', headers, accessToken: session.token }));
    const sessions = await authenticated.listSessions();
    const current = sessions.items.find((item) => item.current);
    if (current) await authenticated.revokeSession({ id: current.id });
}
