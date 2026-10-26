import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import {
    Configuration as IdConfiguration,
    IdApi,
} from "../backend/id/app/contract/client/typescript/.build/dist/index.js";
import {
    Configuration,
    PersonsApi,
    MediaApi,
    AdminApi,
} from "../backend/person/app/contract/client/typescript/.build/dist/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
if (process.argv[2] !== "--local-review")
    throw new Error(
        "Pass --local-review to seed only the persons-feature Docker project.",
    );
process.loadEnvFile(".env");
let account;
try {
    account = JSON.parse(await readFile(".cache/feature-account.json", "utf8"));
} catch (e) {
    if (e.code !== "ENOENT") throw e;
    account = {
        email: "profile-review@persons.local",
        password: `Review!${randomBytes(18).toString("hex")}`,
        id: randomUUID(),
    };
    await writeFile(".cache/feature-account.json", JSON.stringify(account));
}
const lit = (v) => `'${String(v).replaceAll("'", "''")}'`;
execFileSync(
    "docker",
    [
        "compose",
        "-p",
        "persons-feature",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "persons",
        "-d",
        "id",
        "-v",
        "ON_ERROR_STOP=1",
        "-qAt",
    ],
    {
        input: `CREATE EXTENSION IF NOT EXISTS pgcrypto; INSERT INTO accounts(id,email,first_name,last_name,locale,password_hash,failed_logins,created_at,version,role,status) VALUES(${lit(account.id)},${lit(account.email)},'Review','','ru',crypt(${lit(account.password)},gen_salt('bf',12)),0,now(),0,'ADMIN','ACTIVE') ON CONFLICT(id) DO NOTHING;`,
        stdio: ["pipe", "pipe", "pipe"],
    },
);
const now = Math.floor(Date.now() / 1000),
    enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const body = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ iss: "persons", sub: "profile-review", aud: "persons-internal", scope: "service", iat: now, exp: now + 86400, jti: randomUUID() })}`;
const headers = {
    "X-Service-Authorization": `Bearer ${body}.${createHmac("sha256", process.env.PROJECT_INTERNAL_JWT_SECRET).update(body).digest("base64url")}`,
    "X-Client-Origin": "profile-review",
};
const id = new IdApi(
    new IdConfiguration({ basePath: "http://localhost:8081", headers }),
);
const session = await id.createSession({
    credentials: { email: account.email, password: account.password },
});
await writeFile(".cache/feature-session.json", JSON.stringify(session));
const config = new Configuration({
    basePath: "http://localhost:8087/person",
    headers,
    accessToken: session.token,
});
const persons = new PersonsApi(config),
    media = new MediaApi(config),
    admin = new AdminApi(config);

async function approve(receipt) {
    if (receipt.status !== "APPROVED")
        await admin.decideModeration({
            id: receipt.id,
            decisionInput: { decision: "APPROVE" },
        });
}
const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(Date.now());
const date = (d) => new Date(Date.parse(today) + d * 86400000);
const definitions = [
    ["krel", -147, 218],
    ["vadim", 18, 383],
    ["tyamik", -368, -3],
    ["artem", -365, 0],
    ["evgeny", -400, -35],
    ["slava", null, null],
];
const states = {};
for (const [tag, departure, returning] of definitions) {
    let profile;
    try {
        profile = await persons.getPerson({ tag });
    } catch (e) {
        if (e.response?.status !== 404) throw e;
    }
    if (!profile) {
        await approve(
            await persons.createPerson({
                profileInput: {
                    tag,
                    firstName: tag === "krel" ? "Кирилл" : tag,
                    lastName: tag === "krel" ? "Миронов" : "",
                    description:
                        "Большое описание человека. Здесь рассказываем об интересах, общих историях и встречах с друзьями.\n\n".repeat(
                            9,
                        ),
                    tags: ["Свои"],
                    socialLinks: [],
                    ratingOptions: [{ emoji: "💜", label: "Свой" }],
                    version: 0,
                    dates: {
                        birthDate: new Date("2001-05-14"),
                        militaryDepartureDate:
                            departure === null ? undefined : date(departure),
                        militaryReturnDate:
                            returning === null ? undefined : date(returning),
                    },
                },
            }),
        );
        profile = await persons.getPerson({ tag });
    }
    states[tag] = profile.id;
}
const png = await readFile("frontend/assets/achievements/military-duty-v1.png");
const video = await readFile("frontend/person/.cache/feed/moment.webm");
const profile = await persons.getPerson({ tag: "krel" });
if (!profile.avatarMediaId)
    await approve(
        await media.uploadMedia({
            id: profile.id,
            kind: "AVATAR",
            caption: "",
            file: new Blob([png], { type: "image/png" }),
        }),
    );
const existing = await persons.listPhotos({
    id: profile.id,
    page: 0,
    size: 50,
});
if (!existing.items.length) {
    for (let index = 0; index < 14; index++) {
        const kind = index % 2 ? "MOMENT" : "PHOTO";
        await approve(
            await media.uploadMedia({
                id: profile.id,
                kind,
                caption: `${kind === "PHOTO" ? "Фото" : "Видео"} ${index + 1}`,
                file: new Blob([kind === "PHOTO" ? png : video], {
                    type: kind === "PHOTO" ? "image/png" : "video/webm",
                }),
            }),
        );
    }
}
await writeFile(".cache/feature-profiles.json", JSON.stringify(states));
console.log(
    "Real local profiles and mixed gallery ready:",
    Object.keys(states).join(", "),
);
