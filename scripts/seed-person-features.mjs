import { createHmac, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Configuration as IdConfiguration, IdApi } from '../backend/id/app/contract/client/typescript/.build/dist/index.js';
import { Configuration, PersonsApi, GalleryApi, AchievementsApi, AdminApi } from '../backend/person/app/contract/client/typescript/.build/dist/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
process.loadEnvFile('.env');
const credentials = JSON.parse(await readFile('.build/person-demo-account.json', 'utf8'));
const secret = process.env.PROJECT_INTERNAL_JWT_SECRET;
if (!secret) throw new Error('PROJECT_INTERNAL_JWT_SECRET is required.');
const now = Math.floor(Date.now() / 1000);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'persons', sub: 'person-features-seed', aud: 'persons-internal', scope: 'service', iat: now, exp: now + 3600, jti: randomUUID() })}`;
const headers = { 'X-Service-Authorization': `Bearer ${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`, 'X-Client-Origin': 'person-feature-demo', 'User-Agent': 'Persons feature demo seed' };
const id = new IdApi(new IdConfiguration({ basePath: process.env.DEMO_ID_URL ?? 'http://localhost:8081', headers }));
const session = await id.createSession({ credentials: { email: credentials.email, password: credentials.password } });
const config = new Configuration({ basePath: process.env.DEMO_PERSON_URL ?? 'http://localhost:8087/person', accessToken: session.token, headers });
const persons = new PersonsApi(config), gallery = new GalleryApi(config), achievements = new AchievementsApi(config), admin = new AdminApi(config);
const STATE = '.build/person-features-demo.json';
let state;
try { state = JSON.parse(await readFile(STATE, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; state = {}; }
const approve = (receipt) => admin.decideModeration({ id: receipt.id, decisionInput: { decision: 'APPROVE' } });

try {
    const [krel, vadim, tyamik] = await Promise.all(['krel','vadim','tyamik'].map((tag) => persons.getPerson({ tag })));
    for (const [feed, people] of [[await persons.listPhotos({ id: krel.id }), [krel.id, vadim.id]], [await persons.listMoments({ id: krel.id }), [krel.id, tyamik.id]]]) {
        const item = feed.items[0];
        if (!item) continue;
        const detail = await gallery.getMediaDetail({ id: item.mediaId });
        if (!detail.taggedPersons.length) await approve(await gallery.editMedia({ id: item.mediaId, mediaEditInput: { caption: detail.caption, taggedPersonIds: people } }));
    }
    const definitions = [
        { key: 'developer', title: 'Разработчик', description: 'Превращает идеи в работающие вещи. Иногда даже с первого раза.', image: 'developer-v1.png', people: [krel.id] },
        { key: 'pleasantPerson', title: 'Приятный человек', description: 'С ним легко общаться, смеяться и просто быть собой.', image: 'pleasant-person-v1.png', people: [krel.id, vadim.id] },
        { key: 'healthResilience', title: 'Человек, живущий с проблемами со здоровьем', description: 'Знак поддержки, бережного отношения к себе и взаимопомощи.', image: 'health-resilience-v1.png', people: [] },
        { key: 'rabbitLover', title: 'Любитель кроликов', description: 'Ушастые друзья занимают особое место в его сердце.', image: 'rabbit-lover-v1.png', people: [] },
        { key: 'chromosomes47', title: '47 хромосом', description: 'Коллекционный значок с генетическим символом.', image: '47-chromosomes-v1.png', people: [] },
        { key: 'lifestealer', title: 'Lifestealer', description: 'В Dota 2 выбирает только Lifestealer. На остальных героях победа не предусмотрена.', image: 'lifestealer-v1.png', people: [] },
        { key: 'factoryWorker', title: 'Заводчанин', description: 'Работает, собирает детали и держит производство на своих плечах.', image: 'factory-worker-v1.png', people: [] },
        { key: 'militaryDuty', title: 'Военнообязанный', description: 'На воинском учёте. Военный билет — часть коллекции документов.', image: 'military-duty-v1.png', people: [] },
        { key: 'animeFan', title: 'Анимешник', description: 'Сначала ещё одна серия, потом всё остальное.', image: 'anime-fan-v1.png', people: [] },
        { key: 'partyCaller', title: 'Человек, который зовёт всех играть', description: 'Собирает пати, зовёт всех в голосовой чат и верит, что сегодня зайдут все.', image: 'party-caller-v1.png', people: [] },
        { key: 'blind', title: 'Слепой', description: 'Свой путь находит даже без подсказок.', image: 'blind-v1.png', people: [] },
        { key: 'existential', title: 'Живёт, но не знает зачем', description: 'Каждый день заходит в жизнь. Главный квест пока не найден.', image: 'existential-v1.png', people: [] },
    ];
    const existing = await achievements.listAchievements({ page: 0, size: 50 });
    for (const [key, title] of [['company', 'Душа компании'], ['lastRound', 'Ещё одну партию']]) {
        const previous = existing.items.find((item) => item.id === state[key] && item.title === title && item.active);
        if (previous) await achievements.deleteAchievement({ id: previous.id });
    }
    for (const definition of definitions) {
        let achievement = existing.items.find((item) => item.title === definition.title && item.active);
        if (!achievement) {
            const file = new Blob([await readFile(path.join(ROOT, 'frontend/assets/achievements', definition.image))], { type: 'image/png' });
            achievement = await achievements.createAchievement({ title: definition.title, description: definition.description, file });
        }
        if (definition.people.length) await achievements.grantAchievement({ id: achievement.id, achievementGrantInput: { personIds: new Set(definition.people) } });
        state[definition.key] = achievement.id;
    }
    await writeFile(STATE, JSON.stringify(state, null, 2) + '\n');
    console.log('Demo media tags and achievements are ready. /artem remains empty.');
} finally {
    const authenticated = new IdApi(new IdConfiguration({ basePath: process.env.DEMO_ID_URL ?? 'http://localhost:8081', headers, accessToken: session.token }));
    const current = (await authenticated.listSessions()).items.find((item) => item.current);
    if (current) await authenticated.revokeSession({ id: current.id });
}
